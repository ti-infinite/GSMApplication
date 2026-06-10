using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.Entities;

[Table("Profiles", Schema = "db_ms")]
public partial class Profile
{
    [Key]
    public int IdProfile { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string? Name { get; set; }

    public bool? IsActive { get; set; }

    [InverseProperty("IdProfileNavigation")]
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
