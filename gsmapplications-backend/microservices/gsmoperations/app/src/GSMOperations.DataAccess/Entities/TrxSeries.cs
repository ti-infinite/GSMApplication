using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxSeries", Schema = "db_trx")]
public partial class TrxSeries
{
    [Key]
    public int IdTrxSerie { get; set; }

    [StringLength(6)]
    [Unicode(false)]
    public string Prefix { get; set; } = null!;

    [StringLength(500)]
    public string? Descr { get; set; }

    public int? InitialNumber { get; set; }

    public long? CurrentNumber { get; set; }

    public bool HasNumberByLocation { get; set; }
}
