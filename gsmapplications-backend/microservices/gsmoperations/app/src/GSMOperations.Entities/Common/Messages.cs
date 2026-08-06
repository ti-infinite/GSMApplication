
namespace GSMOperations.Entities.Common
{
    public static class Messages
    {
        public static class Operations
        {
            public const string ResourceExecutedSuccessfully = "Resource executed successfully.";
            public const string TrxDefinitionsLoaded = "Transaction definitions loaded succesfully.";
            public const string TransactionLoaded = "Transactions loaded successfully.";
            public const string TransactionAppend = "The values were appended to the TRX successfully";
            public const string TransactionEmpty = "Transaction not found.";
            public const string TransactionCreated = "Transaction created succesfully.";
            public const string PrefixMissing = "The 'TRXPREFIX' field is required in the request.";
            public const string SkuDefinitionsEmpty = "No SKU definitions found.";
            public const string SkuDefinitionsLoaded = "SKU definitions loaded successfully.";
            public const string SuppliersLoaded = "Suppliers loaded successfully.";
            public const string EmployeesLoaded = "Employees loaded successfully.";
            public const string CategoriesLoaded = "Categories loaded successfully.";
            public const string CategoriesEmpty = "No categories found.";
            public const string ParamsLoaded = "Parameter attributes loaded successfully.";
            public const string ParamsEmpty = "No parameter attributes found.";
            public const string ApiExecutedSuccessfully = "Api executed successfully.";
            public const string ApiExecutionFailed = "The executed Api request failed.";
            public const string Healthy = "Application is healthy.";
            public const string EmptyFields = "The url endpoint and the operation fields are required.";
            public const string HttpMethodUnknown = "Http method not implemented.";
            public const string VarietiesLoaded = "Varieties loaded succesfully.";
            public const string SeriesLoaded = "Series loaded succesfully.";
        }

        public static class Events
        {
            public const string EventNotificationSuccess = "Notification queued successfully.";
            public const string EventAdjustSuccess = "Inventory adjusted successfully.";
            public const string EmailNotFoundDifferences = """No se encontraron diferencias entre las cantidades recibidas y las cantidades emitidas.""";
        }
        public static class Tenant
        {
            public const string TenantHeaderMissing = "Tenant header is missing.";
            public const string TenantValid = "Tenant is valid.";
            public const string TenantInvalid = "Company is invalid or inactive.";
        }
    }
}
