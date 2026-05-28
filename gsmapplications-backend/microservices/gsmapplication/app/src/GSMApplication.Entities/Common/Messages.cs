namespace GSMApplication.Entities.Common;

public static class Messages
{
    public static class Application
    {
        public const string MenuLoaded = "Menu response loaded successfully.";
        public const string ApiRuleEmpty = "An Api rule with the given id number was not found.";
        public const string ApiRuleUpdated = "Api rule updated succesfully.";
        public const string ApiRuleExists = "There is already an existing configuration for that Api operation.";
        public const string ApiRuleCreated = "Api rule created succesfully.";
        public const string ApiRuleDeleted = "Api rule deleted succesfully.";
        public const string ApiRulesRetrieved = "Api rules retrieved successfully.";
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
