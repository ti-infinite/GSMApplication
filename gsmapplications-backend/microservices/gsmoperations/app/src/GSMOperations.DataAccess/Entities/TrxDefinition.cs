using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("TrxDefinition", Schema = "db_trx")]
public partial class TrxDefinition
{
    [Key]
    public int IdTrxDefinition { get; set; }

    public int IdTrxSerie { get; set; }

    [StringLength(6)]
    [Unicode(false)]
    public string Prefix { get; set; } = null!;

    public string JsonFront { get; set; } = null!;

    [Column("JsonREA")]
    public string JsonRea { get; set; } = null!;

    public string JsonWorkflow { get; set; } = null!;
}
