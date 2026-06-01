using GSMAuth.Abstractions;
using GSMAuth.Business.Services;
using GSMAuth.Infrastructure.Security;
using Microsoft.Extensions.DependencyInjection;

namespace GSMAuth.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusiness(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        return services;
    }
}