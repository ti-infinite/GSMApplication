using GSMAuth.Abstractions;
using GSMAuth.Entities.Common;
using GSMAuth.Entities.DTOs;
using GSMAuth.Tenant;

namespace GSMAuth.Business;

public sealed class AuthService : IAuthService
{
    private readonly IUserAuthRepository _userAuthRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly TenantContext _tenantContext;

    public AuthService(IUserAuthRepository userAuthRepository, IPasswordHasher passwordHasher, 
            ITokenService tokenService, TenantContext tenantContext)
    {
        _userAuthRepository = userAuthRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
    }

    public async Task<ApiResponse<LoginDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var companyId = request.IDCompany?.Trim();

        if (string.IsNullOrWhiteSpace(companyId))
        {
            return ApiResponse<LoginDto>.FailResult(Messages.Auth.CompanyNotFound, ErrorType.Validation);
        }
        if (string.IsNullOrWhiteSpace(request.User))
        {
            return ApiResponse<LoginDto>.FailResult(Messages.Auth.RequiredCredentials, ErrorType.Validation);
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResponse<LoginDto>.FailResult(Messages.Auth.RequiredCredentials, ErrorType.Validation);
        }


        _tenantContext.CompanyId = companyId;
        var username = request.User.Trim();

        var user = await _userAuthRepository.GetByUsernameAsync(companyId, username, cancellationToken);

        if (user is null)
        {
            return ApiResponse<LoginDto>.FailResult(Messages.Auth.InvalidCredentials, ErrorType.Unauthorized);
        }

        if (!user.IsActive)
        {
            return ApiResponse<LoginDto>.FailResult(Messages.Auth.UserInactive, ErrorType.Unauthorized);
        }

        var passwordIsValid = _passwordHasher.Verify(request.Password, user.PasswordHash);

        if (!passwordIsValid)
        {
            return ApiResponse<LoginDto>.FailResult(Messages.Auth.InvalidCredentials, ErrorType.Unauthorized);
        }

        var tokenClaims = new TokenClaimsDto
        {
            IdUser = user.IdUser,
            CompanyId = companyId,
            IdProfile = user.IdProfile
        };

        var (token, expiresAtUtc) = _tokenService.CreateToken(tokenClaims);

        var response = new LoginDto
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            User = new AuthenticatedUserDto
            {
                IdUser = user.IdUser,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                IdProfile = user.IdProfile,
                PasswordChangeRequired = user.PasswordChangeRequired,
                Location = user.Location,
                Department = user.Department
            }
        };

        return ApiResponse<LoginDto>.SuccessResult(response, Messages.Auth.LoginSuccess);
    }
}