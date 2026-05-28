using GSMAuth.DataAccess.ContextDb;
using GSMAuth.DataAccess.StoredProcedures;
using GSMAuth.Tenant;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GSMAuth.DataAccess;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccess(this IServiceCollection services, string registryConnectionString)
    {

        services.AddDbContext<TenantAuthDbContext>((sp, options) =>
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