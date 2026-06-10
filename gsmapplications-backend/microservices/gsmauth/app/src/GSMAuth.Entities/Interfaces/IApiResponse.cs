using GSMAuth.Entities.Common;

namespace GSMAuth.Entities.Interfaces;

public interface IApiResponse
{
    bool Success { get; }
    ErrorType? ErrorType { get; }
}