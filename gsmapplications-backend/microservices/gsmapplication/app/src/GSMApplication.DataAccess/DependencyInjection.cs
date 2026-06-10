using GSMApplication.DataAccess.ContextDb;
using GSMApplication.DataAccess.Interfaces;
using GSMApplication.DataAccess.StoredProcedures;
using GSMApplication.Tenant;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GSMApplication.DataAccess;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccess(this IServiceCollection services, string registryConnectionString)
    {

        services.AddDbContext<TenantApplicationDbContext>((sp, options) =>
        {
            var tenantContext = sp.GetRequiredService<TenantContext>();

            if (tenantContext.ConnectionInfo is null)
                throw new InvalidOperationException("Tenant not initialized.");

            var connectionString = tenantContext.ConnectionInfo.BuildConnectionString();

            options.UseSqlServer(connectionString);
        });

        services.AddDbContext<RegistryDbContext>(options => options.UseSqlServer(registryConnectionString));

        services.AddScoped<IStoredProcedureExecutor, StoredProcedureExecutor>();

        return services;
    }
}
