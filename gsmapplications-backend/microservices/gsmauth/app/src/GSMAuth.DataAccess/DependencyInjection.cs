using GSMAuth.DataAccess.ContextDb;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GSMAuth.DataAccess;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccess(this IServiceCollection services, string registryConnectionString)
    {
        services.AddDbContext<RegistryDbContext>(options => options.UseSqlServer(registryConnectionString));

        return services;
    }
}