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

    public async Task<string> ExecuteSpScalarAsync(StoredProcedureModel sp, CancellationToken cancellationToken = default)
    {
        var (sql, parameters) = BuildSpExecution(sp);

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

        return result?.ToString() ?? string.Empty;
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

        var spName = root.GetProperty("NameSp").GetString() ?? throw new InvalidOperationException($"Catalog entry '{sp.Name}' has no NameSp.");

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

        var paramAssignments = string.Join(", ", parameters.Select(p => $"{p.ParameterName} = {p.ParameterName}"));

        return ($"EXEC {spName} {paramAssignments}", parameters);
    }
}