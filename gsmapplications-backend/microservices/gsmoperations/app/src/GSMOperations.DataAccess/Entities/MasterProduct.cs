using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("MasterProducts", Schema = "db_ms")]
[Index("IdMasterProduct", Name = "IX_MasterProducts", IsUnique = true)]
public partial class MasterProduct
{
    [Key]
    public int IdMasterProduct { get; set; }

    [StringLength(2000)]
    [Unicode(false)]
    public string MasterProductName { get; set; } = null!;

    public int? IdCategory { get; set; }

    [Column("CategorySKU")]
    [StringLength(200)]
    [Unicode(false)]
    public string? CategorySku { get; set; }

    [Column("GeneratedSKU")]
    [StringLength(200)]
    [Unicode(false)]
    public string? GeneratedSku { get; set; }

    [StringLength(8000)]
    [Unicode(false)]
    public string? ProductCode { get; set; }

    [Column("SKU")]
    [StringLength(8000)]
    [Unicode(false)]
    public string Sku { get; set; } = null!;

    [StringLength(10)]
    [Unicode(false)]
    public string? MeasurementUnit { get; set; }

    [Column(TypeName = "numeric(18, 4)")]
    public decimal? MeasurementUnitValue { get; set; }

    [Column("SecondarySKU")]
    [StringLength(100)]
    [Unicode(false)]
    public string? SecondarySku { get; set; }

    public ICollection<MasterVariety> MasterVarieties { get; set; } = new List<MasterVariety>();
}
