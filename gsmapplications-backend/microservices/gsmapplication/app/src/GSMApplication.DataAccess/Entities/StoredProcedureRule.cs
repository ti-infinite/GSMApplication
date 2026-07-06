using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GSMApplication.DataAccess.Entities;

[Table("StoredProcedureRules", Schema = "db_ms")]
public partial class StoredProcedureRule
{
    [Key]
    public int IdStoredProcedure { get; set; }

    [StringLength(100)]
    public string SpKey { get; set; } = null!;

    [StringLength(100)]
    public string SpName { get; set; } = null!;

    public string? SpParameters { get; set; }

    [StringLength(150)]
    public string? Descr { get; set; }
}
