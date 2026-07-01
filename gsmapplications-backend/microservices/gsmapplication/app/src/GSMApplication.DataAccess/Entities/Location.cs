using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.Entities;

[Table("Locations", Schema = "db_ms")]
public partial class Location
{
    [Key]
    public int IdLocation { get; set; }

    public int IdThirdLocation { get; set; }

    [StringLength(5)]
    [Unicode(false)]
    public string CodeLocation { get; set; } = null!;

    [StringLength(50)]
    public string? Descr { get; set; }

    [StringLength(150)]
    public string? Email { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? PhoneNumber { get; set; }

    [StringLength(150)]
    public string? AddressLocation { get; set; }

    public bool IsActive { get; set; }
}
