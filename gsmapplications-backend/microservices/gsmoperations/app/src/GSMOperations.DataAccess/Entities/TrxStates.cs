using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxStates", Schema = "db_ms")]
public partial class TrxStates
{
    [Key]
    public long IdTrxState { get; set; }

    public long IdTrxHeader { get; set; }

    [Column("FromTrxState")]
    [StringLength(50)]
    [Unicode(false)]
    public string? FromTrxState { get; set; }

    [Column("ToTrxState")]
    [StringLength(50)]
    [Unicode(false)]
    public string? ToTrxState { get; set; }

    [Column(TypeName = "datetime2")]
    public DateTime? StateDate { get; set; }

    [StringLength(2000)]
    [Unicode(false)]
    public string? Comments { get; set; }

    public TrxHeader TrxHeader { get; set; } = null!;
}
