using System.Security.Claims;

namespace GSMGateway.Abstractions.Tenant;

public interface IGatewayTenantService
{
    string? ResolveCompanyId(ClaimsPrincipal principal);
}
