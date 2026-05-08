using GSMAuth.Abstractions;
using GSMAuth.Entities.DTOs;
using GSMAuth.Entities.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace GSMAuth.Infrastructure.Security;

public sealed class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAtUtc) CreateToken(TokenClaimsDto claim)
    {
        var jwt = _configuration.GetSection("JwtSettings");
        var issuer = jwt["Issuer"] ?? throw new InvalidOperationException("JwtSettings:Issuer no configurado.");
        var audience = jwt["Audience"] ?? throw new InvalidOperationException("JwtSettings:Audience no configurado.");
        var secret = jwt["SecretKey"] ?? throw new InvalidOperationException("JwtSettings:SecretKey no configurado.");
        var expirationMinutes = int.TryParse(jwt["ExpirationMinutes"], out var minutes) ? minutes : 60;

        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var tokenClaims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, claim.IdUser.ToString()),
            new("companyId", claim.CompanyId),
            new("idProfile", claim.IdProfile.ToString()),
            new(ClaimTypes.Role, claim.IdProfile.ToString())
        };


        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: tokenClaims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
