namespace GSMOperations.Entities.DTOs;

public sealed class EventExecutionResultDTO
{
    public required string EventName { get; init; }
    public bool Success { get; init; }
    public string? Message { get; init;}

}