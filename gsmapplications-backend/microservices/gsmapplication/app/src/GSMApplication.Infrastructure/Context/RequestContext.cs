using GSMApplication.Abstractions;
using GSMApplication.Tenant;
using Microsoft.AspNetCore.Http;

namespace GSMApplication.Infrastructure.Context;

public sealed class RequestContext : IRequestContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RequestContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string CompanyId =>
        _httpContextAccessor.HttpContext?
            .Request.Headers[TenantHeaderConstants.CompanyIdHeaderName]
            .FirstOrDefault()
        ?? throw new InvalidOperationException("CompanyId not found.");

    public int IdProfile
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?
                .Request.Headers[TenantHeaderConstants.ProfileIdHeaderName]
                .FirstOrDefault();

            return int.TryParse(value, out var id)
                ? id
                : throw new InvalidOperationException("Invalid profile id.");
        }
    }
}