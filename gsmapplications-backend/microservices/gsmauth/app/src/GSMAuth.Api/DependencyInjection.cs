using GSMAuth.Api.Filters;

namespace GSMAuth.Api;

public static class DependencyInjection
{
    public static IServiceCollection AddApiServices(this IServiceCollection services)
    {
        services.AddScoped<ApiResponseFilter>();

        return services;
    }
}