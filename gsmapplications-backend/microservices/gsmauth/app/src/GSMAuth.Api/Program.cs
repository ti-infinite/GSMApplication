using GSMAuth.Abstractions;
using GSMAuth.Business;
using GSMAuth.Entities.Common;
using Microsoft.AspNetCore.Authorization;
using GSMAuth.DataAccess;
using GSMAuth.Infrastructure;
using GSMAuth.Infrastructure.Security;
using GSMAuth.Tenant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

config["JwtSettings:SecretKey"]?.Replace("${JWT_SECRET}", Environment.GetEnvironmentVariable("JWT_SECRET") ?? "");

// ------------------------------------------------------------
// Controllers
// ------------------------------------------------------------
builder.Services.AddControllers();
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
var registryConnection =
    Environment.GetEnvironmentVariable("DB_MASTER_URL");

if (string.IsNullOrWhiteSpace(registryConnection))
{
    registryConnection =
        builder.Configuration
            .GetConnectionString("TenantRegistryConnection");
}

if (string.IsNullOrWhiteSpace(registryConnection))
{
    throw new InvalidOperationException(
        "No se encontró la conexión al Tenant Registry. Configure DB_MASTER_URL o ConnectionStrings:TenantRegistryConnection.");
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

var issuer =
    jwt["Issuer"] ??
    throw new InvalidOperationException("JwtSettings:Issuer no configurado.");

var audience =
    jwt["Audience"] ??
    throw new InvalidOperationException("JwtSettings:Audience no configurado.");

var secret =
    jwt["SecretKey"] ??
    throw new InvalidOperationException("JwtSettings:SecretKey no configurado.");

// ------------------------------------------------------------
// Auth + Authorization
// ------------------------------------------------------------
builder.Services.AddAuthorization();

builder.Services.AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = issuer,
                ValidAudience = audience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secret)),

                ClockSkew = TimeSpan.Zero
            };
    });

var app = builder.Build();

// ------------------------------------------------------------
// Middleware Pipeline
// ------------------------------------------------------------
app.UseSwagger();
app.UseSwaggerUI(options =>
    options.SwaggerEndpoint(
        "/swagger/v1/swagger.json",
        "GSMAuth API v1"));

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.UseTenantLayer();

app.MapGet("/health", [AllowAnonymous] () => Results.Ok(new { message = Messages.Auth.Healthy }));

app.MapControllers();

await app.RunAsync();