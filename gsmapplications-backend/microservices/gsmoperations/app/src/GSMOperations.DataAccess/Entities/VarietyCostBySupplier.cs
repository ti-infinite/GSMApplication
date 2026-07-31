using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("VarietyCostBySupplier", Schema = "db_ms")]
public partial class VarietyCostBySupplier
{
    [Key]
    public int IdCostBySupplier { get; set; }

    public int IdVariety { get; set; }

    public Guid IdSupplier { get; set; }

    [Column(TypeName = "money")]
    public decimal ProductionCost { get; set; }

    [Column(TypeName = "money")]
    public decimal? ExtraCost { get; set; }

    public bool IsActive { get; set; }
}
