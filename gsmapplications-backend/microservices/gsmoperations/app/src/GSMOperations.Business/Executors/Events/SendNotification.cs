using GSMOperations.Abstractions;
using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models.Events;
using GSMOperations.Entities.Models.Transactions;

namespace GSMOperations.Business.Executors.Events;

public abstract class SendNotification : IEventExecutor
{
    protected readonly IAgentNotificacions _agentNotificacions;
    public abstract string EventName { get; }
    protected abstract string NotificationType { get; }


    protected SendNotification(IAgentNotificacions agentNotificacions)
    {
        _agentNotificacions = agentNotificacions;
    }

    public async Task<EventExecutionResultDTO> ExecuteAsync(JsonReaEvents eventDefinition, TrxHeader trxRequest, CancellationToken cancellationToken)
    {
        try
        {
            var bodyType = ResolveParameter(
                eventDefinition,
                "bodyType",
                trxRequest)
                .Single();

            var attType = ResolveParameter(
                eventDefinition,
                "attType",
                trxRequest)
                .Single();

            var attDocumentType = ResolveParameter(
                eventDefinition,
                "attDocumentType",
                trxRequest)
                .Single();

            var attValueTemplate = ResolveParameter(
                eventDefinition,
                "attValue",
                trxRequest)
                .Single();

            var to = ResolveParameter(
                eventDefinition,
                "to",
                trxRequest);

            var subjectTemplate = ResolveParameter(
                eventDefinition,
                "subject",
                trxRequest)
                .Single();

            var bodyTemplate = ResolveParameter(
                eventDefinition,
                "body",
                trxRequest)
                .Single();

            var attValue = ResolveTemplate(
                attValueTemplate,
                trxRequest);

            var subject = ResolveTemplate(
                subjectTemplate,
                trxRequest);

            var body = ResolveTemplate(
                bodyTemplate,
                trxRequest);

            var notificationRequest = new NotificationRequest
            {
                NotificationType = NotificationType,
                AttType = attType,
                AttDocumentType = attDocumentType,
                AttValue = attValue,
                To = to,
                Subject = subject,
                Body = body,
                BodyType = bodyType
            };

            await _agentNotificacions.SendAsync(
                notificationRequest,
                cancellationToken);

            return new EventExecutionResultDTO
            {
                EventName = EventName,
                Success = true,
                Message = Messages.Events.EventNotificationSuccess
            };
        }
        catch (Exception ex)
        {
            return new EventExecutionResultDTO
            {
                EventName = EventName,
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