using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace GSMGateway.Tenant;

public static class TenantExtensions
{
    public static IServiceCollection AddTenantLayer(this IServiceCollection services)
    {
        services.AddScoped<TenantContext>();
        return services;
    }

    public static IApplicationBuilder UseTenantLayer(this IApplicationBuilder app)
    {
        app.UseMiddleware<TenantHeaderInjectionMiddleware>();
        return app;
    }
}
