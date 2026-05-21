using GSMApplication.Abstractions;
using GSMApplication.Business.Interfaces;
using GSMApplication.Business.Services;
using Microsoft.Extensions.DependencyInjection;

namespace GSMApplication.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusiness(this IServiceCollection services)
    {
        services.AddScoped<IMenuService, MenuService>();
        services.AddScoped<IMultimediaResourceService, MultimediaResourceService>();
        return services;
    }
}
