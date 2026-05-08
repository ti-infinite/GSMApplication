using GSMAuth.Entities.Models;
using GSMAuth.DataAccess.Entities;

namespace GSMAuth.DataAccess.Mappers;

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