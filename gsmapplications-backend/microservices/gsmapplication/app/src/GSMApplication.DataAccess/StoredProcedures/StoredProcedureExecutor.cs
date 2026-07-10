using GSMApplication.DataAccess.ContextDb;
using GSMApplication.DataAccess.Interfaces;
using GSMApplication.Entities.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

namespace GSMApplication.DataAccess.StoredProcedures;

public sealed class StoredProcedureExecutor : IStoredProcedureExecutor
{
    private readonly TenantApplicationDbContext _context;

    public StoredProcedureExecutor(TenantApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<T?> ExecuteSpScalarAsync<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default)
    {
        var (sql, parameters) = await BuildSpExecution(sp);

        var connection = _context.Database.GetDbConnection();

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.CommandType = CommandType.Text;

        foreach (var parameter in parameters)
        {
            command.Parameters.Add(parameter);
        }

        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        var result = await command.ExecuteScalarAsync(cancellationToken);

        if (result == null || result == DBNull.Value)
            return default;

        var targetType = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);
        if (result is T variable)
            return variable;

        return (T)Convert.ChangeType(result, Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T));
    }

    public async Task<int> ExecuteSpAsyncNoReturn(StoredProcedureModel sp, CancellationToken cancellationToken = default)
    {
        var (sql, parameters) = await BuildSpExecution(sp);

        return await _context.Database
            .ExecuteSqlRawAsync(sql, parameters, cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<List<T>> ExecuteSpAsyncWithReturn<T>(StoredProcedureModel sp, CancellationToken cancellationToken = default) where T : class
    {
        var (sql, parameters) = await BuildSpExecution(sp);

        return await _context.Database
            .SqlQueryRaw<T>(sql, parameters)
            .AsNoTracking()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task<(string sql, SqlParameter[] parameters)> BuildSpExecution(StoredProcedureModel sp)
    {
        var existingSp = await _context.StoredProcedureRules
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.SpKey == sp.Name);

        if (existingSp == null)
            throw new InvalidOperationException($"Stored procedure '{sp.Name}' not found in database.");

        var spName = existingSp.SpName;

        if (string.IsNullOrWhiteSpace(existingSp.SpParameters))
            return ($"EXEC {spName}", Array.Empty<SqlParameter>());

        List<Dictionary<string, object?>> paramDefinitions = new();

        try
        {
            using var doc = JsonDocument.Parse(existingSp.SpParameters);

            if (doc.RootElement.TryGetProperty("Params", out var paramsElement) &&
                paramsElement.ValueKind == JsonValueKind.Array)
            {
                paramDefinitions = paramsElement
                    .EnumerateArray()
                    .Select(p => new Dictionary<string, object?>
                    {
                        ["ParamName"] = p.GetProperty("ParamName").GetString()
                    })
                    .ToList();
            }
            else
            {
                throw new InvalidOperationException($"Missing or invalid 'Params' array in SpParameters for SP '{sp.Name}'.");
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Invalid JSON format in SpParameters for SP '{sp.Name}'.", ex);
        }

        var parameters = paramDefinitions
            .Select(p =>
            {
                if (!p.TryGetValue("ParamName", out var paramObj) ||
                    paramObj is not string paramName || string.IsNullOrWhiteSpace(paramName))
                {
                    throw new InvalidOperationException($"Invalid parameter definition in DB for SP '{sp.Name}'.");
                }

                if (!sp.Parameters.TryGetValue(paramName, out var value))
                {
                    throw new InvalidOperationException($"Required parameter '{paramName}' missing for SP '{sp.Name}'.");
                }

                return new SqlParameter(paramName, value ?? DBNull.Value);
            })
            .ToArray();

        var paramAssignments = parameters.Length == 0 ? ""
            : string.Join(", ", parameters.Select(p => $"{p.ParameterName} = {p.ParameterName}"));

        var sql = string.IsNullOrEmpty(paramAssignments)
            ? $"EXEC {spName}"
            : $"EXEC {spName} {paramAssignments}";

        return (sql, parameters);
    }
}