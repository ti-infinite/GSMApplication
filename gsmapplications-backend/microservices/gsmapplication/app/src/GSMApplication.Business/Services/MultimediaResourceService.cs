using GSMApplication.Business.Interfaces;
using GSMApplication.DataAccess.ContextDb;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.Business.Services
{
    public sealed class MultimediaResourceService : IMultimediaResourceService
    {
        private readonly TenantApplicationDbContext _context;

        public MultimediaResourceService(TenantApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<MultimediaResourceDto>>> GetMultimediaResourceByCategory(List<string> resourceCategory, CancellationToken cancellationToken = default)
        {
            var result = await _context.MultimediaResources
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
                return ApiResponse<List<MultimediaResourceDto>>.FailResult(Messages.Application.ResourcesEmpty, ErrorType.NotFound);
            }

            return ApiResponse<List<MultimediaResourceDto>>.SuccessResult(result, Messages.Application.ResourcesLoaded);
        }
    }
}