using System.Security.Cryptography.X509Certificates;
using GSMApplication.Business.Interfaces;
using GSMApplication.DataAccess.ContextFactory;
using GSMApplication.Entities.Common;
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

        public async Task<ApiResponse<List<MultimediaResourceDto>>> GetMultimediaResourceByCategory(
        List<string> resourceCategory, CancellationToken cancellationToken = default)
        {

            var connectionInfo = _tenantContext.ConnectionInfo ?? throw new InvalidOperationException("Tenant not initialized.");

            var connectionString = connectionInfo.BuildConnectionString();

            await using var context = TenantApplicationDbContextFactory.Create(connectionString);

            var result = await context.MultimediaResources
                .Where(x => resourceCategory.Contains(x.ResourceCategory) && x.IsActive)
                .Select(x => new MultimediaResourceDto
                {
                    ResourceCategory = x.ResourceCategory,
                    ResourceOrder = x.ResourceOrder,
                    Config = x.Config
                })
                .OrderBy(x => x.ResourceOrder)
                .ToListAsync(cancellationToken);

            if (result.Count == 0)
            {
                return ApiResponse<List<MultimediaResourceDto>>.FailResponse(Messages.Application.ResourcesEmpty, ErrorType.NotFound);
            }

            return ApiResponse<List<MultimediaResourceDto>>.SuccessResponse(result, Messages.Application.ResourcesLoaded);
        }

    }

}