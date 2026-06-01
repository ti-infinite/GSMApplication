using GSMApplication.Abstractions;
using GSMApplication.Business.Interfaces;
using GSMApplication.Business.Services;
using GSMApplication.Entities.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace GSMApplication.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusiness(this IServiceCollection services)
    {
        services.AddScoped<IMenuService, MenuService>();
        services.AddScoped<IMultimediaResourceService, MultimediaResourceService>();
        services.AddScoped<IApiRulesManagementService, ApiRulesManagementService>();
        services.AddScoped<IUsersManagementService, UsersManagementService>();
        return services;
    }
}
