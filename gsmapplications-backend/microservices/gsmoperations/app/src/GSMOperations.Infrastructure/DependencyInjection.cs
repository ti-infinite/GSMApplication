
using GSMOperations.Abstractions;
using GSMOperations.Infrastructure.Tenant;
using Microsoft.Extensions.DependencyInjection;

namespace GSMOperations.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<ITenantConnectionResolver, TenantConnectionResolver>();
            return services;
        }
    }
}
