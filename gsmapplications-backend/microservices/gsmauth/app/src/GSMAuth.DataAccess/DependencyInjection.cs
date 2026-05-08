using GSMAuth.DataAccess.ContextDb;
using GSMAuth.DataAccess.ContextFactory;
using GSMAuth.DataAccess.StoredProcedures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GSMAuth.DataAccess;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccess(this IServiceCollection services, string registryConnectionString)
    {
        services.AddDbContext<RegistryDbContext>(options => options.UseSqlServer(registryConnectionString));

        services.AddScoped<IStoredProcedureExecutor, StoredProcedureExecutor>();

        return services;
    }
}