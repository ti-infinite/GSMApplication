using GSMGateway.Abstractions.Security;
using GSMGateway.Infrastructure.Security;
using Microsoft.Extensions.DependencyInjection;

namespace GSMGateway.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<ICompanyIdClaimReader, JwtCompanyIdClaimReader>();
        return services;
    }
}
