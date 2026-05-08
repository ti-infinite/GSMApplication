using GSMAuth.Entities.Models;

namespace GSMAuth.Tenant;

public sealed class TenantContext
{
    public string? CompanyId { get; set; }
    public TenantConnectionInfo? ConnectionInfo { get; set; }
}
