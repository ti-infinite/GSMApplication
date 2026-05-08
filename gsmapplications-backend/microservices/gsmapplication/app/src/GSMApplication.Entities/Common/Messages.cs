namespace GSMApplication.Entities.Common;

public static class Messages
{
    public static class Application
    {
        public const string MenuLoaded = "Menu response loaded successfully.";
        public const string InvalidToken = "Invalid token.";
        public const string Healthy = "Application is healthy.";
    }

    public static class Tenant
    {
        public const string TenantHeaderMissing = "Tenant header is missing.";
        public const string TenantValid = "Tenant is valid.";
        public const string TenantInvalid = "Company is invalid or inactive.";
    }
}
