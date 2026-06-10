namespace GSMAuth.Entities.Models;

public sealed class TenantConnectionInfo
{
    public string CompanyId { get; }
    public string DbServer { get; }
    public string DatabaseName { get; }
    public string? DbUser { get; }
    public string? DbPassword { get; }

    public TenantConnectionInfo(
        string companyId,
        string dbServer,
        string databaseName,
        string? dbUser,
        string? dbPassword)
    {
        CompanyId = companyId;
        DbServer = dbServer;
        DatabaseName = databaseName;
        DbUser = dbUser;
        DbPassword = dbPassword;
    }

    public string BuildConnectionString()
    {
        var user = DbUser?.Trim();
        var password = DbPassword?.Trim();

        if (!string.IsNullOrWhiteSpace(user))
        {
            return $"Server={DbServer};" +
                   $"Database={DatabaseName};" +
                   $"User Id={user};" +
                   $"Password={password};" +
                   $"TrustServerCertificate=True;" +
                   $"MultipleActiveResultSets=true;";
        }

        return $"Server={DbServer};" +
               $"Database={DatabaseName};" +
               $"Trusted_Connection=True;" +
               $"TrustServerCertificate=True;" +
               $"MultipleActiveResultSets=true;";
    }
}