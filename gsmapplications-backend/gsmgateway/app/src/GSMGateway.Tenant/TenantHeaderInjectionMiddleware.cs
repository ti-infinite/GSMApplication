using GSMGateway.Abstractions.Tenant;
using Microsoft.AspNetCore.Http;

namespace GSMGateway.Tenant;

public sealed class TenantHeaderInjectionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantHeaderInjectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        TenantContext tenantContext,
        IGatewayTenantService gatewayTenantService)
    {
        // Nunca confiar en un X-Company-Id enviado por el cliente.
        context.Request.Headers.Remove(TenantHeaderConstants.CompanyIdHeaderName);

        var companyId = gatewayTenantService.ResolveCompanyId(context.User);
        if (!string.IsNullOrWhiteSpace(companyId))
        {
            tenantContext.CompanyId = companyId;
            context.Request.Headers[TenantHeaderConstants.CompanyIdHeaderName] = companyId;
        }

        await _next(context);
    }
}
