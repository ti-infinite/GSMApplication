using GSMOperations.Api.Filters;

namespace GSMOperations.Api
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApiServices(this IServiceCollection services)
        {
            services.AddScoped<ApiResponseFilter>();

            return services;
        }
    }

}
