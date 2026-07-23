using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxProductAttributes", Schema = "db_trx")]
public partial class TrxProductAttribute
{
    [Key]
    public long IdTrxProductAttributes { get; set; }

    public long IdTrxProduct { get; set; }

    public long IdTrxHeader { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string AttributeKey { get; set; } = null!;

    [Unicode(false)]
    public string? AttributeValue { get; set; }

    public TrxHeader TrxHeader { get; set; } = null!;

    public TrxProduct TrxProduct { get; set; } = null!;
}
