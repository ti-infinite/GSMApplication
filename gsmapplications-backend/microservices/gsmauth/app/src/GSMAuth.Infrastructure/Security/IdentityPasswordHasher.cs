using Microsoft.AspNetCore.Identity;
using GSMAuth.Abstractions;

namespace GSMAuth.Infrastructure.Security;

public sealed class IdentityPasswordHasher : IPasswordHasher
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