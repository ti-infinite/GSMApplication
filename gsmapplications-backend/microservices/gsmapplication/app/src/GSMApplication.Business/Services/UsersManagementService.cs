using GSMApplication.Abstractions;
using GSMApplication.Business.Interfaces;
using GSMApplication.DataAccess.ContextDb;
using GSMApplication.DataAccess.Entities;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;

namespace GSMApplication.Business.Services;

public sealed class UsersManagementService : IUsersManagementService
{
    private readonly TenantApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public UsersManagementService(TenantApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context; 
        _passwordHasher = passwordHasher;
    }
    

    public async Task<ApiResponse<ResponseUserDTO>> CreateUser(CreateUserDTO userCreated, CancellationToken cancellationToken = default)
    {
        var entity = new User
        {
            Username = userCreated.Username,
            FirstName = userCreated.FirstName,
            LastName = userCreated.LastName,
            FullName = userCreated.FullName,
            Email = userCreated.Email,
            Department = userCreated.Department,
            IdProfile = userCreated.IdProfile,
            Location = userCreated.Location,
            PasswordHash = _passwordHasher.Hash(userCreated.Password)
        };

        _context.Users.Add(entity);

        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<ResponseUserDTO>.SuccessResult(
            new ResponseUserDTO
            {
                Username = entity.Username,
                FullName = entity.FullName,
                IdProfile = entity.IdProfile,
                Location = entity.Location
            },
            Messages.Application.UserCreated
        );
    }

    public async Task<ApiResponse<bool>> UpdateUserPassword(Guid idUser, UpdateUserPasswordDTO userPasswordUpdated, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Users.FindAsync(new object[] { idUser } ,cancellationToken);

        if (entity is null)
        {
            return ApiResponse<bool>.FailResult(Messages.Application.UserNotFound, ErrorType.NotFound);
        }


        var oldPasswordIsValid = _passwordHasher.Verify(userPasswordUpdated.OldPassword, entity.PasswordHash);

        if (!oldPasswordIsValid)
        {
            return ApiResponse<bool>.FailResult(Messages.Application.InvalidOldPassword, ErrorType.Unauthorized);
        }

        
        var newPasswordIsSameAsOld = _passwordHasher.Verify(userPasswordUpdated.NewPassword, entity.PasswordHash);

        if (newPasswordIsSameAsOld)
        {
            return ApiResponse<bool>.FailResult(Messages.Application.NewPasswordCannotBeSameAsOld, ErrorType.BadRequest);
        }


        entity.PasswordHash           = _passwordHasher.Hash(userPasswordUpdated.NewPassword);
        entity.PasswordChangeRequired = false;
        entity.PasswordUpdateDate     = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.SuccessResult(true, Messages.Application.PasswordUpdated);
    }
    
}