using System.Security.Claims;
using GSMGateway.Abstractions.Security;
using GSMGateway.Entities.Tenant;

namespace GSMGateway.Infrastructure.Security;

public sealed class JwtCompanyIdClaimReader : ICompanyIdClaimReader
{
    public string? ReadCompanyId(ClaimsPrincipal principal)
    {
        return principal.FindFirst(TenantClaimConstants.CompanyIdClaim)?.Value;
    }
}
