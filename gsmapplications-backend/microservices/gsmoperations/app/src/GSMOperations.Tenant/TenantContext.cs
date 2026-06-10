
using GSMOperations.Entities.Models;

namespace GSMOperations.Tenant
{
    public sealed class TenantContext
    {
        public string? CompanyId { get; set; }
        public TenantConnectionInfo? ConnectionInfo { get; set; }
    }
}
