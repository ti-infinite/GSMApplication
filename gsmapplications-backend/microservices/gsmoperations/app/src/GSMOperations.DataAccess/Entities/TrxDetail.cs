using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxDetails", Schema = "db_trx")]
public partial class TrxDetail
{
    [Key]
    public long IdTrxDetail { get; set; }

    public long IdTrxHeader { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string DetailType { get; set; } = null!;

    [Unicode(false)]
    public string? DetailValue { get; set; }

    public TrxHeader TrxHeader { get; set; } = null!;
}
