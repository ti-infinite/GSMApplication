using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.Models;


namespace GSMOperations.DataAccess.Mappers
{
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
}
