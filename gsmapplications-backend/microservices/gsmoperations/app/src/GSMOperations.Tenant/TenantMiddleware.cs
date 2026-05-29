using GSMOperations.Abstractions;
using Microsoft.AspNetCore.Http;

namespace GSMOperations.Tenant
{
    public sealed class TenantMiddleware
    {
        private readonly RequestDelegate _next;

        public TenantMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, TenantContext tenantContext, ITenantConnectionResolver resolver)
        {

            var companyId = context.Request.Headers[TenantHeaderConstants.CompanyIdHeaderName].ToString().Trim();
            //var companyId =
            //    context.Request.Headers.TryGetValue(TenantHeaderConstants.CompanyIdHeaderName, out var headerValue)
            //        && !string.IsNullOrWhiteSpace(headerValue)
            //        ? headerValue.ToString().Trim()
            //        : context.User.FindFirst("companyId")?.Value?.Trim();

            if (!string.IsNullOrWhiteSpace(companyId))
            {
                var connectionInfo = await resolver.ResolveAsync(companyId);

                tenantContext.CompanyId = companyId;
                tenantContext.ConnectionInfo = connectionInfo;
            }

            await _next(context);
        }

    }
}
