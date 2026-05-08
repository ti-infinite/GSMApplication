using GSMAuth.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace GSMAuth.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusiness(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}