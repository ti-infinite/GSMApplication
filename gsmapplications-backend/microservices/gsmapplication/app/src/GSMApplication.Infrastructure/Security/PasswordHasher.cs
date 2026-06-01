
using GSMApplication.Abstractions;
using Microsoft.AspNetCore.Identity;

namespace GSMApplication.Infrastructure.Security;

public sealed class PasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<object> _hasher = new();

    public string Hash(string password)
        => _hasher.HashPassword(null!, password);

    public bool Verify(string password, string hash)
    {
        var result = _hasher.VerifyHashedPassword(null!, hash, password);

        return result != PasswordVerificationResult.Failed;
    }
}