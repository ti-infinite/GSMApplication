using GSMAuth.Abstractions;
using GSMAuth.Entities.DTOs;
using GSMAuth.Entities.Common;

namespace GSMAuth.Business;

public sealed class AuthService : IAuthService
{
    private readonly IUserAuthRepository _userAuthRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthService(
        IUserAuthRepository userAuthRepository,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _userAuthRepository = userAuthRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<LoginResponseDto> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var companyId = request.IDCompany.Trim();

        var user = await _userAuthRepository.GetByUsernameAsync(
            companyId,
            request.User.Trim(),
            cancellationToken);

        if (user is null)
            return Fail(Messages.Auth.UserNotFound, ErrorType.NotFound);

        if (!user.IsActive)
            return Fail(Messages.Auth.UserInactive, ErrorType.Unauthorized);


        var passwordIsValid = _passwordHasher.Verify(
            request.Password,
            user.PasswordHash);


        if (!passwordIsValid)
            return Fail(Messages.Auth.InvalidCredentials, ErrorType.Unauthorized);

        var tokenClaims = new TokenClaimsDto
        {
            IdUser = user.IdUser,
            CompanyId = companyId,
            IdProfile = user.IdProfile
        };

        var (token, expiresAtUtc) = _tokenService.CreateToken(tokenClaims);

        return new LoginResponseDto
        {
            Success = true,
            Message = Messages.Auth.LoginSuccess,
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
    }
    private static LoginResponseDto Fail(string message, ErrorType errorType)
        => new()
        {
            Success = false,
            Message = message,
            ErrorType = errorType
        };
}