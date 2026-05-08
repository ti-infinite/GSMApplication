using GSMAuth.Abstractions;
using GSMAuth.Infrastructure.Repositories;
using GSMAuth.Infrastructure.Security;
using GSMAuth.Infrastructure.Tenant;
using Microsoft.Extensions.DependencyInjection;

namespace GSMAuth.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IPasswordHasher, IdentityPasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<ITenantConnectionResolver, TenantConnectionResolver>();
        services.AddScoped<IUserAuthRepository, UserAuthRepository>();
        services.AddScoped<ITenantConfigurationService, TenantConfigurationService>();
        return services;
    }
}
