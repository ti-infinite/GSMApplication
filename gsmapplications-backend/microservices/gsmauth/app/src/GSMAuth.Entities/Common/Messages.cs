namespace GSMAuth.Entities.Common;

public static class Messages
{
    public static class Auth
    {
        public const string LoginSuccess = "Login successful.";
        public const string CompanyNotFound = "Company does not exist.";
        public const string InvalidCredentials = "Invalid credentials.";
        public const string RequiredCredentials = "Required credentials are missing.";
        public const string UserInactive = "User is inactive.";
        public const string Healthy = "Auth is healthy.";
    }

    public static class Tenant
    {
        public const string TenantValid = "Tenant is valid.";
        public const string TenantInvalid = "Company is invalid or inactive.";
    }
}