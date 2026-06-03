using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("ParamAttributes", Schema = "db_ms")]
public partial class ParamAttribute
{
    [Key]
    public int IdParamAttribute { get; set; }

    public int IdParameter { get; set; }

    [StringLength(200)]
    [Unicode(false)]
    public string? ShortName { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string? Code { get; set; }

    [StringLength(500)]
    public string? Descr { get; set; }

    public GlobalParameter GlobalParameter { get; set; } = null!;
}
