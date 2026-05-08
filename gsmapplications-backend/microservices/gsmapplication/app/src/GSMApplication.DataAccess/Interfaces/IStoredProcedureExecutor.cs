using GSMApplication.Entities.Models;

namespace GSMApplication.DataAccess.StoredProcedures;

public interface IStoredProcedureExecutor
{
    Task<int> ExecuteSpAsyncNoReturn(StoredProcedureModel sp, CancellationToken cancellationToken = default);
    Task<List<T>> ExecuteSpAsyncWithReturn<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default) where T : class;
    Task<string> ExecuteSpScalarAsync(StoredProcedureModel sp, CancellationToken cancellationToken = default);
}