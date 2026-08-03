using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("Notifications", Schema = "db_srv")]
public partial class Notification
{
    [Key]
    public long IdNotification { get; set; }

    [StringLength(10)]
    [Unicode(false)]
    public string NotificationType { get; set; } = null!;

    [Column(TypeName = "text")]
    public string NotificationBody { get; set; } = null!;

    public bool IsSent { get; set; }

    [StringLength(1000)]
    public string? NotificationError { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [Precision(0)]
    public DateTime? ProcessingSince { get; set; }

    public int RetryCount { get; set; }

    [Precision(0)]
    public DateTime? SentAt { get; set; }

    [StringLength(200)]
    public string? ProviderMessageId { get; set; }
}
