using GSMApplication.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace GSMApplication.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusiness(this IServiceCollection services)
    {
        services.AddScoped<IMenuService, MenuService>();
        return services;
    }
}
