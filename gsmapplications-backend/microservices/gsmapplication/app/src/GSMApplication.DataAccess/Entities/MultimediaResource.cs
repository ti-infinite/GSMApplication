using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.Entities;

[Table("MultimediaResources", Schema = "db_ms")]
public partial class MultimediaResource
{
    [Key]
    public int IdResource { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public required string ResourceCategory { get; set; }

    public required int ResourceOrder { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string? Descr { get; set; }

    public required string Config { get; set; }

    public required bool IsActive { get; set; }
}
