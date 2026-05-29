
using GSMOperations.Entities.Common;

namespace GSMOperations.Entities.Interfaces
{
    public interface IApiResponse
    {
        bool Success { get; }
        ErrorType? ErrorType { get; }
    }
}
