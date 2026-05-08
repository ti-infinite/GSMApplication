using GSMApplication.Abstractions;
using GSMApplication.Entities.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;

namespace GSMApplication.Tenant;

public static class TenantExtensions
{
    public static IServiceCollection AddTenantLayer(this IServiceCollection services)
    {
        services.AddScoped<TenantContext>();
        return services;
    }

    public static IApplicationBuilder UseTenantLayer(this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            var tenantContext = context.RequestServices.GetRequiredService<TenantContext>();
            var resolver = context.RequestServices.GetRequiredService<ITenantConnectionResolver>();

            // 1. Obtener companyId desde header o token
            var companyId =
                context.Request.Headers.TryGetValue(TenantHeaderConstants.CompanyIdHeaderName, out var headerValue)
                    && !string.IsNullOrWhiteSpace(headerValue)
                    ? headerValue.ToString().Trim()
                    : context.User.FindFirst("companyId")?.Value?.Trim();

            if (!string.IsNullOrWhiteSpace(companyId))
            {
                // 2. Resolver el tenant REAL (esto es lo que faltaba 🔥)
                var connectionInfo = await resolver.ResolveAsync(companyId);

                // 3. Guardarlo en el contexto
                tenantContext.CompanyId = companyId;
                tenantContext.ConnectionInfo = connectionInfo;
            }

            await next();
        });

        return app;
    }
}
