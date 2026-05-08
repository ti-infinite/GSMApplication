using GSMApplication.Abstractions;
using GSMApplication.Infrastructure.Tenant;
using Microsoft.Extensions.DependencyInjection;

namespace GSMApplication.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<ITenantConnectionResolver, TenantConnectionResolver>();
        return services;
    }
}
