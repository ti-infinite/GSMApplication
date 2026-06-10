using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("MasterVarieties", Schema = "db_ms")]
public partial class MasterVariety
{
    [Key]
    public int IdVariety { get; set; }

    public int IdMasterProduct { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string? Name { get; set; }

    [StringLength(2000)]
    [Unicode(false)]
    public string? Descr { get; set; }

    [Column(TypeName = "numeric(18, 4)")]
    public decimal? Qty { get; set; }

    public bool IsActive { get; set; }

    public MasterProduct MasterProduct { get; set; } = null!;
}
