using GSMOperations.Abstractions;

namespace GSMOperations.Business.Executors.Events;

public sealed class SendEmailNotification : SendNotification
{
    public const string EventExecutorName = "EMAIL_NOTIFICATION";
    public override string EventName => EventExecutorName;
    protected override string NotificationType => "EMAIL";

    public SendEmailNotification(IAgentNotificacions agentNotificacions) : base(agentNotificacions) { }
}