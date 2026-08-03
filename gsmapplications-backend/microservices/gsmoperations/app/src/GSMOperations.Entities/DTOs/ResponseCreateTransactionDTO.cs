
using GSMOperations.Entities.DTOs;

public sealed class ResponseCreateTransactionDTO
{
    public string TrxDocument { get; init; } = string.Empty;
    public List<EventExecutionResultDTO> Events { get; init; } = [];
}