using GSMApplication.Entities.Common;

namespace GSMApplication.Entities.Interfaces;

public interface IApiResponse
{
    bool Success { get; set; }
    ErrorType? ErrorType { get; set; }
}