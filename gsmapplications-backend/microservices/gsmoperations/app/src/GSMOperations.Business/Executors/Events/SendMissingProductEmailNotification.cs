using System.Globalization;
using System.Net;
using System.Text;
using GSMOperations.Abstractions;
using GSMOperations.Business.Executors.Events;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.Common;

namespace GSMOperations.Business.Executors;

public sealed class SendMissingProductEmailNotification : SendNotification
{
    public const string EventExecutorName = "EMAIL_NOTIFICATION_MISSINGPRODUCT";
    public override string EventName => EventExecutorName;
    protected override string NotificationType => "EMAIL";
    public SendMissingProductEmailNotification(IAgentNotificacions agentNotificacions) : base(agentNotificacions) { }

    protected override string BuildBody(string bodyTemplate, TrxHeader trxRequest)
    {
        var buildHtmlResponse = HtmlTableBuilder(trxRequest);

        return ResolveTemplate(bodyTemplate, trxRequest)
            .Replace("{ProductDifferences}", buildHtmlResponse);
    }

    private static string HtmlTableBuilder(TrxHeader trxRequest)
    {
        var rows = new StringBuilder();
        foreach (var product in trxRequest.TrxProducts)
        {
            var originalQty = product.TrxProductAttributes
                .FirstOrDefault(x =>
                    x.AttributeKey.Equals("OriginalQty", StringComparison.OrdinalIgnoreCase))?.AttributeValue;
            var receivedQty = product.Qty;

            if (!decimal.TryParse(originalQty, CultureInfo.InvariantCulture, out var finalOriginalQty))
            {
                continue;
            }
            
            if (finalOriginalQty == receivedQty)
            {
                continue;
            }

            var herbName = WebUtility.HtmlEncode(product.VarietyName);
            rows.AppendLine($"""
                <TR>
                    <TD>{herbName}</TD>
                    <TD>{finalOriginalQty:N2}</TD>
                    <TD>{receivedQty:N2}</TD>
                </TR>
            """);
        }

        if (rows.Length == 0)
        {
            return Messages.Events.EmailNotFoundDifferences;
        }

        return $"""
            <TABLE BORDER="1" CELLPADING="3" CELLSPACING="0">
                <THEAD>
                    <TR>
                        <TH>Hierba</TH>
                        <TH>Qty Esperada</TH>
                        <TH>Qty Recibida</TH>
                    </TR>
                </THEAD>
                <TBODY>
                    {rows}
                </TBODY>
            </TABLE>        
            """;
    }
}