using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxProducts", Schema = "db_trx")]
public partial class TrxProduct
{
    [Key]
    public long IdTrxProduct { get; set; }

    public long IdTrxHeader { get; set; }

    public int IdVariety { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string? VarietyName { get; set; }

    [Column("SKU")]
    [StringLength(100)]
    [Unicode(false)]
    public string? Sku { get; set; }

    [Column(TypeName = "numeric(18, 4)")]
    public decimal? Qty { get; set; }

    public TrxHeader TrxHeader { get; set; } = null!;

    public ICollection<TrxProductAttribute> TrxProductAttributes { get; set; } = new List<TrxProductAttribute>();
}
