using GSMAuth.Entities.DTOs;
using GSMAuth.Entities.Models;

namespace GSMAuth.Abstractions;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(TokenClaimsDto claim);
}
