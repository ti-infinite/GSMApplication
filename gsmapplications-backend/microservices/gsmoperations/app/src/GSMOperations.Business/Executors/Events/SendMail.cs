using GSMOperations.Abstractions;
using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models.Events;
using GSMOperations.Entities.Models.Transactions;

namespace GSMOperations.Business.Executors.Events;

public sealed class SendMail : IEventExecutor
{
    private readonly IEmailService _emailService;

    public const string EventExecutorName = "SEND_EMAIL";

    public string EventName => EventExecutorName;

    public SendMail(IEmailService emailService)
    {
        _emailService = emailService;
    }

    public async Task<EventExecutionResultDTO> ExecuteAsync(JsonReaEvents eventDefinition, TrxHeader trxRequest, CancellationToken cancellationToken)
    {
        try
        {
            var from = ResolveParameter(
                eventDefinition,
                "from",
                trxRequest)
                .First();

            var to = ResolveParameter(
                eventDefinition,
                "to",
                trxRequest);

            var subjectTemplate = ResolveParameter(
                eventDefinition,
                "subject",
                trxRequest)
                .First();

            var subject = ResolveTemplate(
                subjectTemplate,
                trxRequest);

            var emailRequest = new EmailRequest
            {
                From = from,
                To = to,
                Subject = subject,
                Body = "Funciono!"
            };

            await _emailService.SendAsync(
                emailRequest,
                cancellationToken);

            return new EventExecutionResultDTO
            {
                EventName = EventExecutorName,
                Success = true,
                Message = "Email sent successfully."
            };
        }
        catch (Exception ex)
        {
            return new EventExecutionResultDTO
            {
                EventName = EventExecutorName,
                Success = false,
                Message = ex.Message
            };
        }
    }

    private static List<string> ResolveParameter(JsonReaEvents eventDefinition, string parameterKey, TrxHeader trx)
    {
        var parameter = eventDefinition.Parameters
            .FirstOrDefault(x =>
                x.Key.Equals(
                    parameterKey,
                    StringComparison.OrdinalIgnoreCase));

        if (parameter is null)
        {
            throw new InvalidOperationException($"Parameter '{parameterKey}' not configured.");
        }

        if (string.IsNullOrWhiteSpace(parameter.SourceType))
        {
            return parameter.Values;
        }

        var values = trx.TrxAttributes
            .Where(x =>
                x.AttributeKey.Equals(
                    parameter.SourceType,
                    StringComparison.OrdinalIgnoreCase))
            .Select(x => x.AttributeValue)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!)
            .ToList();

        if (!values.Any())
        {
            throw new InvalidOperationException($"Attribute '{parameter.SourceType}' not found.");
        }

        return values;
    }

    private static string ResolveTemplate(string template, TrxHeader trx)
    {
        return template
            .Replace("{TrxDocument}", trx.TrxDocument ?? string.Empty)
            .Replace("{Location}", trx.Location ?? string.Empty)
            .Replace("{Status}", trx.Status ?? string.Empty)
            .Replace("{Username}", trx.Username ?? string.Empty);
    }
}