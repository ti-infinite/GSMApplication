namespace GSMAuth.Abstractions;

public interface ITenantConfigurationService
{
    Task<string?> GetJsonStylesAsync(string companyId, CancellationToken cancellationToken);
}
