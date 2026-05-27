using GSMApplication.DataAccess.ContextDb;
using GSMApplication.DataAccess.Interfaces;
using GSMApplication.DataAccess.StoredProcedures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GSMApplication.DataAccess;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccess(this IServiceCollection services, string registryConnectionString)
    {
        services.AddDbContext<RegistryDbContext>(options => options.UseSqlServer(registryConnectionString));

        services.AddScoped<IStoredProcedureExecutor, StoredProcedureExecutor>();

        return services;
    }
}
