namespace GSMApplication.Entities.Common;

public static class Messages
{
    public static class Application
    {
        public const string MenuLoaded = "Menu response loaded successfully.";
        public const string InvalidToken = "Invalid token.";
        public const string Healthy = "Application is healthy.";
        public const string MenuEmpty = "No menu options found for the given profile.";
        public const string ResourcesEmpty = "No resources found for the given categories.";
        public const string ResourcesLoaded = "Resources loaded successfully.";
        public const string InvalidCategories = "Invalid categories. Please provide at least one category.";
    }

    public static class Tenant
    {
        public const string TenantHeaderMissing = "Tenant header is missing.";
        public const string TenantValid = "Tenant is valid.";
        public const string TenantInvalid = "Company is invalid or inactive.";
    }
}
