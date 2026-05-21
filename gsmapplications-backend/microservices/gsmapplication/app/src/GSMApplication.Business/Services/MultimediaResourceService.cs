using System.Security.Cryptography.X509Certificates;
using GSMApplication.Business.Interfaces;
using GSMApplication.DataAccess.ContextFactory;
using GSMApplication.Entities.DTOs;
using GSMApplication.Tenant;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.Business.Services
{
    
    public class MultimediaResourceService : IMultimediaResourceService
    {

        private readonly TenantContext _tenantContext;

        public MultimediaResourceService(TenantContext tenantContext)
        {
           _tenantContext = tenantContext; 
        }

        public async Task<List<MultimediaResourceDto>> GetMultimediaResourceByCategory(List<string> resourceCategory, CancellationToken cancellationToken = default)
        {
            try
            {
                var connectionInfo = _tenantContext.ConnectionInfo ?? throw new InvalidOperationException("Tenant not initialized.");

                var connectionString = connectionInfo.BuildConnectionString();

                await using var context = TenantApplicationDbContextFactory.Create(connectionString);
             
                return await context.MultimediaResources
                            .Where(x => resourceCategory.Contains(x.ResourceCategory) && x.IsActive == true)
                            .Select(x => new MultimediaResourceDto
                            {
                                ResourceCategory = x.ResourceCategory,
                                ResourceOrder = x.ResourceOrder,
                                Config = x.Config
                            })
                            .OrderBy(x => x.ResourceOrder)
                            .ToListAsync(cancellationToken);
            }
            catch 
            {
                throw;
            }

        }

    }

}