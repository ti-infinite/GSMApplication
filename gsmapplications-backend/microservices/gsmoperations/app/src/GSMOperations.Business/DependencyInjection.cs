using GSMOperations.Business.Executors.Events;
using GSMOperations.Business.Executors.Resources;
using GSMOperations.Business.Interfaces;
using GSMOperations.Business.Services;
using GSMOPerations.Business.Services;
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
            services.AddScoped<IGlobalAndParamAttributeService, GlobalAndParamAttributeService>();
            services.AddScoped<IMasterHerbsService, MasterHerbsService>();
            services.AddScoped<IEmployeesService, EmployeesService>();
            services.AddScoped<ISuppliersService, SuppliersService>();
            services.AddScoped<ICategoriesService, CategoriesService>();
            services.AddScoped<ISkuDefinitionsService, SkuDefinitionsService>();
            services.AddScoped<IManageTransactionService, ManageTransactionService>();
            services.AddScoped<IResourceExecutorService, ResourceExecutorService>();
            services.AddScoped<IEventExecutorService, EventExecutorService>();
            services.AddScoped<IResourceExecutor, LoadConsumoSobrante>();
            services.AddScoped<IEventExecutor, SendEmailNotification>();
            services.AddScoped<IResourceExecutor, LoadSobrante>();
            services.AddScoped<IEventExecutor, AdjustInventory>();

            return services;
        }
    }
}
