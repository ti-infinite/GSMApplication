using GSMOperations.Business.Interfaces;
using GSMOperations.Business.Services;
using Microsoft.Extensions.DependencyInjection;

namespace GSMOperations.Business
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddBusiness(this IServiceCollection services)
        {
            services.AddHttpClient<IApiManagementService, ApiManagementService>(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            return services;
        }
    }
}
