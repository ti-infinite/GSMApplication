using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("InventoryTraceability", Schema = "db_aud")]
public partial class InventoryTraceability
{
    [Key]
    public int IdInventoryTraceability { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string TrxDocument { get; set; } = null!;

    [Column(TypeName = "numeric(18, 4)")]
    public decimal Qty { get; set; }

    public DateTime TrxDate { get; set; }

    public int IdVariety { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string VarietyName { get; set; } = null!;

    [StringLength(100)]
    public string CodeLocation { get; set; } = null!;
}
