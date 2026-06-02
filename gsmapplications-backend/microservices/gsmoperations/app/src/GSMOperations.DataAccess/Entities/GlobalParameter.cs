using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("GlobalParameters", Schema = "db_ms")]
public partial class GlobalParameter
{
    [Key]
    public int IdParameter { get; set; }

    [StringLength(100)]
    [Unicode(false)]
    public string ParamCategory { get; set; } = null!;

    [StringLength(200)]
    [Unicode(false)]
    public string? ShortName { get; set; }

    [StringLength(500)]
    public string? Descr { get; set; }

    [InverseProperty("IdParameterNavigation")]
    public virtual ICollection<ParamAttribute> ParamAttributes { get; set; } = new List<ParamAttribute>();
}
