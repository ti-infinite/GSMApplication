using GSMApplication.Api.Filters;

namespace GSMApplication.Api;

public static class DependencyInjection
{
    public static IServiceCollection AddApiServices(this IServiceCollection services)
    {
        services.AddScoped<ApiResponseFilter>();

        return services;
    }
}