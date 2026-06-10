using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.Entities;

[Table("ApiRules", Schema = "db_ms")]
public partial class ApiRule
{
    [Key]
    public int IdApi { get; set; }

    [StringLength(100)]
    [Unicode(false)]
    public string ShortName { get; set; } = null!;

    [StringLength(200)]
    [Unicode(false)]
    public string? Descr { get; set; }

    [StringLength(500)]
    public string UrlEndPoint { get; set; } = null!;

    [StringLength(10)]
    [Unicode(false)]
    public string Operation { get; set; } = null!;
}
