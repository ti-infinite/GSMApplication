using GSMApplication.DataAccess.Entities;
using GSMApplication.Entities.Models;

namespace GSMApplication.DataAccess.Mappers;

public static class TenantMapper
{
    public static TenantConnectionInfo ToConnectionInfo(this TenantRegistryRecord record)
    {
        return new TenantConnectionInfo(
            record.CompanyId,
            record.DbServer,
            record.DatabaseName,
            record.DbUser,
            record.DbPassword
        );
    }
}
