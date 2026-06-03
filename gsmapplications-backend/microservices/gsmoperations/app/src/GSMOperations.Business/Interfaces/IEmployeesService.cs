using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Interfaces;

public interface IEmployeesService
{
   Task<ApiResponse<List<EmployeeDTO>>> GetFilteredEmployees(SearchEmployee? searchCriteria, CancellationToken cancellation = default); 
}