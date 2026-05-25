using GSMApplication.Business;
using GSMApplication.Entities.Common;
using Microsoft.AspNetCore.Authorization;
using GSMApplication.DataAccess;
using GSMApplication.Infrastructure;
using GSMApplication.Tenant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using GSMApplication.Api.Middleware;
using GSMApplication.Api.Filters;

var builder = WebApplication.CreateBuilder(args);

var config = builder.Configuration;

var envSecret = Environment.GetEnvironmentVariable("JWT_SECRET");

if (string.IsNullOrWhiteSpace(envSecret))
{
    throw new InvalidOperationException("JWT_SECRET is not configured for this environment.");
}

config["JwtSettings:SecretKey"] = envSecret;


// ------------------------------------------------------------
// Controllers
// ------------------------------------------------------------
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiResponseFilter>();
});
builder.Services.AddEndpointsApiExplorer();

// ------------------------------------------------------------
// Swagger Config
// ------------------------------------------------------------
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GSMApplication API",
        Version = "v1",
        Description = "Microservicio de aplicación con soporte tenant database-per-tenant."
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

// ------------------------------------------------------------
// Tenant Registry Connection (ENV or AppSettings)
// ------------------------------------------------------------
var registryConnection = Environment.GetEnvironmentVariable("DB_MASTER_URL");

if (string.IsNullOrWhiteSpace(registryConnection))
{
    throw new InvalidOperationException("No Tenant registry connection was found");
}

// ------------------------------------------------------------
// DataAccess
// ------------------------------------------------------------
builder.Services.AddDataAccess(registryConnection);

// ------------------------------------------------------------
// Multi-Tenant Layer
// ------------------------------------------------------------
builder.Services.AddTenantLayer();

// ------------------------------------------------------------
// Infrastructure
// ------------------------------------------------------------
builder.Services.AddInfrastructure();

// ------------------------------------------------------------
// Business Layer
// ------------------------------------------------------------
builder.Services.AddBusiness();

// ------------------------------------------------------------
// JWT Config
// ------------------------------------------------------------
var jwt = builder.Configuration.GetSection("JwtSettings");

var issuer = jwt["Issuer"]
    ?? throw new InvalidOperationException("JwtSettings:Issuer no configurado.");

var audience = jwt["Audience"]
    ?? throw new InvalidOperationException("JwtSettings:Audience no configurado.");

var secret = jwt["SecretKey"]
    ?? throw new InvalidOperationException("JwtSettings:SecretKey no configurado.");

// ------------------------------------------------------------
// Auth + Authorization
// ------------------------------------------------------------
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
});

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
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.Zero
        };
    });

var app = builder.Build();

// ------------------------------------------------------------
// Middleware Pipeline
// ------------------------------------------------------------
if(app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "GSMApplication API v1"));
}

//app.UseHttpsRedirection();
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenantLayer();

app.MapGet("/health", [AllowAnonymous] () => Results.Ok(new { message = Messages.Application.Healthy }));
app.MapControllers();
await app.RunAsync();
