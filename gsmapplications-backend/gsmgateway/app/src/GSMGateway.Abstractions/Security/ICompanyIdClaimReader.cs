using System.Security.Claims;

namespace GSMGateway.Abstractions.Security;

public interface ICompanyIdClaimReader
{
    string? ReadCompanyId(ClaimsPrincipal principal);
}
