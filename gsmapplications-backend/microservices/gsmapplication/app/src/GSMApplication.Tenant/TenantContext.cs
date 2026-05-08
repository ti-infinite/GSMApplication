using GSMApplication.Entities.Models;

namespace GSMApplication.Tenant;

public sealed class TenantContext
{
    public string? CompanyId { get; set; }
    public TenantConnectionInfo? ConnectionInfo { get; set; }
}
