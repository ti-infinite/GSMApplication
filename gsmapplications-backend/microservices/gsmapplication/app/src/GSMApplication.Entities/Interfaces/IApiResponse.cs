using GSMApplication.Entities.Common;

namespace GSMApplication.Entities.Interfaces;

public interface IApiResponse
{
    bool Success { get; }
    ErrorType? ErrorType { get; }
}