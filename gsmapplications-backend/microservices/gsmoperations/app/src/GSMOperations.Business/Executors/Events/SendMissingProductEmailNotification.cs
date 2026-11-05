using System.Globalization;
using System.Net;
using System.Reflection;
using System.Text;
using GSMOperations.Abstractions;
using GSMOperations.Business.Executors.Events;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.Models.Transactions;

namespace GSMOperations.Business.Executors;

public sealed class SendMissingProductEmailNotification : SendNotification
{
    public const string EventExecutorName = "EMAIL_NOTIFICATION_MISSINGPRODUCT";
    public override string EventName => EventExecutorName;
    protected override string NotificationType => "EMAIL";
    private const string attributePrefix = "TrxProductAttributes.";
    public SendMissingProductEmailNotification(IAgentNotificacions agentNotificacions) : base(agentNotificacions) { }

    protected override string BuildBody(string bodyTemplate, JsonReaEvents eventDefinition, TrxHeader trxRequest)
    {

        var comparissonAttributes = ResolveParameter(eventDefinition, "comparissonAttributes", trxRequest);

        var rows  = BuildProductDifferenceRows(trxRequest, comparissonAttributes);

        return ResolveTemplate(bodyTemplate, trxRequest).Replace("{ProductDifferences}", rows );
    }

    private static string BuildProductDifferenceRows(TrxHeader trxRequest, IReadOnlyList<string> comparissonAttributes)
    {

        var originalValuePath = comparissonAttributes[0];
        var receivedValuePath = comparissonAttributes[1];
        var rows = new StringBuilder();

        foreach (var product in trxRequest.TrxProducts)
        {
            var originalValue = ResolveValue(product, originalValuePath);
            var receivedValue = ResolveValue(product, receivedValuePath);

            if (!decimal.TryParse(originalValue, CultureInfo.InvariantCulture, out var originalQty))
            {
                continue;
            }
            
            if (!decimal.TryParse(receivedValue, CultureInfo.InvariantCulture, out var receivedQty))
            {
                continue;
            }

            if (originalQty == receivedQty)
            {
                continue;
            }

            var varietyName = WebUtility.HtmlEncode(product.VarietyName);
            rows.AppendLine($"""
                <TR>
                    <TD>{varietyName}</TD>
                    <TD>{originalQty.ToString("N2", CultureInfo.InvariantCulture)}</TD>
                    <TD>{receivedQty.ToString("N2", CultureInfo.InvariantCulture)}</TD>
                </TR>
            """);
        }

        return rows.ToString();
    }

    private static string? ResolveValue(TrxProduct product, string path)
    {
        if (path.StartsWith(attributePrefix, StringComparison.OrdinalIgnoreCase))
        {
            var attributeKey = path[attributePrefix.Length..];

            return product.TrxProductAttributes
                .FirstOrDefault(x =>
                    x.AttributeKey.Equals(attributeKey, StringComparison.OrdinalIgnoreCase))
                ?.AttributeValue;
        }

        var property = product.GetType().GetProperty(path, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        if (property is null)
        {
            throw new InvalidOperationException($"Product property '{path}' was not found.");
        }

        return Convert.ToString(property.GetValue(product), CultureInfo.InvariantCulture);
    }



}