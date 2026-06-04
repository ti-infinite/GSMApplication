using GSMOperations.DataAccess.ContextDb;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GSMOperations.DataAccess.StoredProcedures
{
    public sealed class StoredProcedureExecutor : IStoredProcedureExecutor
    {
        private readonly TenantOperationsDbContext _context;

        public StoredProcedureExecutor(TenantOperationsDbContext context)
        {
            _context = context;
        }

        public async Task<T?> ExecuteSpScalarAsync<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default)
        {
            var (sql, parameters) = BuildSpExecution(sp);

            var connection = _context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandType = System.Data.CommandType.Text;

            foreach (var parameter in parameters)
            {
                command.Parameters.Add(parameter);
            }

            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            var result = await command.ExecuteScalarAsync(cancellationToken);

            if (result == null || result == DBNull.Value)
                return default;

            
            var targetType = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);
            return (T)Convert.ChangeType(result, targetType);

        }

        public async Task<int> ExecuteSpAsyncNoReturn(StoredProcedureModel sp, CancellationToken cancellationToken = default)
        {
            var (sql, parameters) = BuildSpExecution(sp);

            return await _context.Database
                .ExecuteSqlRawAsync(sql, parameters, cancellationToken)
                .ConfigureAwait(false);
        }

        public async Task<List<T>> ExecuteSpAsyncWithReturn<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default) where T : class
        {
            var (sql, parameters) = BuildSpExecution(sp);

            return await _context.Database
                .SqlQueryRaw<T>(sql, parameters)
                .AsNoTracking()
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
        }

        private static (string sql, SqlParameter[] parameters) BuildSpExecution(StoredProcedureModel sp)
        {
            if (!StoredProcedureCatalog.Procedures.TryGetValue(sp.Name, out var spContent))
                throw new InvalidOperationException($"Stored procedure '{sp.Name}' not found in catalog.");

            using var jsonSp = JsonDocument.Parse(spContent);
            var root = jsonSp.RootElement;

            var spName = root.GetProperty("NameSp").GetString()
                ?? throw new InvalidOperationException($"Catalog entry '{sp.Name}' has no NameSp.");

            if (!root.TryGetProperty("Params", out var paramsElement))
                return ($"EXEC {spName}", Array.Empty<SqlParameter>());

            var parameters = paramsElement
                .EnumerateArray()
                .Select(p =>
                {
                    var paramName = p.GetProperty("ParamName").GetString()!;
                    if (!sp.Parameters.TryGetValue(paramName, out var paramValue))
                        throw new InvalidOperationException($"Required parameter '{paramName}' missing for SP '{sp.Name}'.");
                    return new SqlParameter(paramName, paramValue ?? DBNull.Value);
                })
                .ToArray();

            var paramAssignments = string.Join(", ",
                parameters.Select(p => $"{p.ParameterName} = {p.ParameterName}"));

            return ($"EXEC {spName} {paramAssignments}", parameters);
        }
    }
}
