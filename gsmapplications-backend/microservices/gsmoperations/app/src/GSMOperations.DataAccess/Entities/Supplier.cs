using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("Suppliers", Schema = "db_ms")]
public partial class Supplier
{
    [Key]
    public Guid IdSupplier { get; set; }

    [StringLength(10)]
    public string IdThirdSupplier { get; set; } = null!;

    [StringLength(500)]
    public string NameSupplier { get; set; } = null!;

    [StringLength(20)]
    [Unicode(false)]
    public string CategorySupplier { get; set; } = null!;

    [StringLength(50)]
    public string? Region { get; set; }

    [StringLength(3)]
    [Unicode(false)]
    public string Country { get; set; } = null!;

    public string? Contact { get; set; }

    public bool IsActive { get; set; }
}
