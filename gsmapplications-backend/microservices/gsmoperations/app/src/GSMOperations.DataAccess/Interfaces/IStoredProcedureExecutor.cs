

using GSMOperations.Entities.Models;

namespace GSMOperations.DataAccess.Interfaces
{
    public interface IStoredProcedureExecutor
    {
        Task<int> ExecuteSpAsyncNoReturn(StoredProcedureModel sp, CancellationToken cancellationToken = default);
        Task<List<T>> ExecuteSpAsyncWithReturn<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default) where T : class;
        Task<T?> ExecuteSpScalarAsync<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default);
    }
}
