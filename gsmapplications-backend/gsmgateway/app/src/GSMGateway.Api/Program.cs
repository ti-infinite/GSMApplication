using GSMGateway.Abstractions.Tenant;
using GSMGateway.Business.Tenant;
using GSMGateway.Entities.Common;
using GSMGateway.Entities.Security;
using GSMGateway.Infrastructure;
using GSMGateway.Tenant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

var envSecret = Environment.GetEnvironmentVariable("JWT_SECRET");

if (string.IsNullOrWhiteSpace(envSecret))
{
    throw new InvalidOperationException("JWT_SECRET nis not configured for this environment.");
}

config["JwtSettings:SecretKey"] = envSecret;

var jwt = config.GetSection("JwtSettings").Get<JwtSettingsOptions>()
          ?? throw new InvalidOperationException("JwtSettings not configured.");

if (string.IsNullOrWhiteSpace(jwt.SecretKey))
{
    throw new InvalidOperationException("JwtSettings:SecretKey is empty.");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GSMGateway API",
        Version = "v1",
        Description = "Gateway YARP para la plataforma GSM con inyección automática de tenant desde JWT."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header usando el esquema Bearer. Ejemplo: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddInfrastructure();
builder.Services.AddScoped<IGatewayTenantService, GatewayTenantService>();
builder.Services.AddTenantLayer();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt.SecretKey)
            ),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AuthenticatedUser", policy => policy.RequireAuthenticatedUser());
    options.FallbackPolicy = options.DefaultPolicy;
});

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var userId =
                context.User?.FindFirst("sub")?.Value
                ?? context.Request.Headers["X-User-Id"].FirstOrDefault()
                ?? context.Connection.RemoteIpAddress?.ToString()
                ?? "anonymous";


        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: userId,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "GSMGateway API v1");
    });
}
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseTenantLayer();

app.MapGet("/api/health", [AllowAnonymous] () =>
    Results.Ok(new { message = Messages.Gateway.Healthy }));

app.MapReverseProxy();

await app.RunAsync();