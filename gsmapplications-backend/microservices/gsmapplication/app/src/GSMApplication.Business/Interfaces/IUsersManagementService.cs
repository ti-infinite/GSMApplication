using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;

namespace GSMApplication.Business.Interfaces;

public interface IUsersManagementService
{
    Task<ApiResponse<ResponseUserDTO>> CreateUser(CreateUserDTO userCreated, CancellationToken cancellationToken = default);
    Task<ApiResponse<bool>> UpdateUserPassword(int idUser, UpdateUserPasswordDTO userPasswordUpdated, CancellationToken cancellationToken = default);
}