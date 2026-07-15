using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxHeaders", Schema = "db_trx")]
public partial class TrxHeader
{
    [Key]
    public long IdTrxHeader { get; set; }

    [StringLength(6)]
    [Unicode(false)]
    public string TrxPrefix { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string TrxDocument { get; set; } = null!;

    [StringLength(500)]
    public string? Descr { get; set; }

    [Column(TypeName = "datetime2")]
    public DateTime TrxDate { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string? Status { get; set; }

    [StringLength(100)]
    public string? Username { get; set; }

    [StringLength(100)]
    public string? Location { get; set; }

    public  ICollection<TrxAttribute> TrxAttributes { get; set; } = new List<TrxAttribute>();

    public  ICollection<TrxProduct> TrxProducts { get; set; } = new List<TrxProduct>();

    public  ICollection<TrxStates> TrxStates { get; set; } = new List<TrxStates>();

    public  ICollection<TrxDetail> TrxDetails { get; set; } = new List<TrxDetail>();
}
