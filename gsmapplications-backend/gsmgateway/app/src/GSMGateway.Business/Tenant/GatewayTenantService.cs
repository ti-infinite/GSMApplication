using System.Security.Claims;
using GSMGateway.Abstractions.Security;
using GSMGateway.Abstractions.Tenant;

namespace GSMGateway.Business.Tenant;

public sealed class GatewayTenantService : IGatewayTenantService
{
    private readonly ICompanyIdClaimReader _companyIdClaimReader;

    public GatewayTenantService(ICompanyIdClaimReader companyIdClaimReader)
    {
        _companyIdClaimReader = companyIdClaimReader;
    }

    public string? ResolveCompanyId(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return null;

        var companyId = _companyIdClaimReader.ReadCompanyId(principal);
        return string.IsNullOrWhiteSpace(companyId)
            ? null
            : companyId.Trim();
    }
}
