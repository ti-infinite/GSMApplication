
using GSMOperations.Abstractions;
using GSMOperations.Infrastructure.Services;
using GSMOperations.Infrastructure.Tenant;
using Microsoft.Extensions.DependencyInjection;
using Resend;

namespace GSMOperations.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<ITenantConnectionResolver, TenantConnectionResolver>();

            services.AddScoped<IAgentNotificacions, EmailNotificationAgentService>();
            return services;
        }
    }
}
