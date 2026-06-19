using GSMAuth.Business;
using GSMAuth.Entities.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GSMAuth.DataAccess;
using GSMAuth.Infrastructure;
using GSMAuth.Tenant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using GSMAuth.Api.Middleware;
using GSMAuth.Api.Filters;
using GSMAuth.Api;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// En prod: logs en JSON estructurado → CloudWatch Logs Insights filtra por campo (Level, TraceId, ...).
// En dev: se mantiene la consola de texto legible.
if (!builder.Environment.IsDevelopment())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole(options => options.IncludeScopes = true);
}

// Prod inyecta JWT_SECRET como env var (Parameter Store) → lo mapeamos sobre JwtSettings:SecretKey.
// Dev lo toma directo de appsettings.Development.json (JwtSettings:SecretKey).
var envSecret = config["JWT_SECRET"];

if (!string.IsNullOrWhiteSpace(envSecret))
{
    config["JwtSettings:SecretKey"] = envSecret;
}

if (string.IsNullOrWhiteSpace(config["JwtSettings:SecretKey"]))
{
    throw new InvalidOperationException("JwtSettings:SecretKey is not configured.");
}

// ------------------------------------------------------------
// Controllers
// ------------------------------------------------------------
builder.Services.AddApiServices();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiResponseFilter>();
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
})
.ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = _ =>
        new BadRequestObjectResult(
            ApiResponse<object>.FailResult("Invalid request data.", ErrorType.Validation)
        );
});
builder.Services.AddEndpointsApiExplorer();

// ------------------------------------------------------------
// Swagger Config
// ------------------------------------------------------------
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GSMAuth API",
        Version = "v1",
        Description = "Microservicio de autenticación con soporte tenant database-per-tenant."
    });

    options.CustomOperationIds(e => e.ActionDescriptor.RouteValues.TryGetValue("action", out var action) ? action : null);

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
// Tenant Registry Connection
// ------------------------------------------------------------
// Prod: env var DB_MASTER_URL (Parameter Store). Dev: ConnectionStrings:TenantRegistryConnection de appsettings.Development.json.
var registryConnection = config["DB_MASTER_URL"]
    ?? config.GetConnectionString("TenantRegistryConnection");

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
// Infrastructure (Repos, Hasher, Resolver, Token)
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

var issuer = jwt["Issuer"] ?? throw new InvalidOperationException("JwtSettings:Issuer no configurado.");

var audience = jwt["Audience"] ?? throw new InvalidOperationException("JwtSettings:Audience no configurado.");

var secret = jwt["SecretKey"] ?? throw new InvalidOperationException("JwtSettings:SecretKey no configurado.");

// ------------------------------------------------------------
// Auth + Authorization
// ------------------------------------------------------------
builder.Services.AddAuthorization();

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
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue("gsm_token", out var cookieToken))
                    ctx.Token = cookieToken;
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

// ------------------------------------------------------------
// Middleware Pipeline
// ------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "GSMAuth API v1"));
}

//app.UseHttpsRedirection();
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenantLayer();

app.MapGet("/health", [AllowAnonymous] () => Results.Ok(new { message = Messages.Auth.Healthy }));
app.MapControllers();
await app.RunAsync();