using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.Entities;

[Table("Users", Schema = "db_ms")]
[Index("Username", Name = "UQ__Users__536C85E4F46828F2", IsUnique = true)]
public partial class User
{
    [Key]
    public Guid IdUser { get; set; }

    [StringLength(100)]
    public string Username { get; set; } = null!;

    [StringLength(100)]
    public required string FirstName { get; set; }

    [StringLength(100)]
    public string? LastName { get; set; }

    [StringLength(200)]
    public string? FullName { get; set; }

    [StringLength(200)]
    public string? Email { get; set; }

    [StringLength(100)]
    public string? Department { get; set; }

    public required int IdProfile { get; set; }

    public bool PasswordChangeRequired { get; set; }

    [StringLength(100)]
    public string? Location { get; set; }

    public bool IsActive { get; set; }

    [StringLength(500)]
    public string PasswordHash { get; set; } = null!;

    public DateTime? LastSessionDate { get; set; }

    public DateTime? PasswordUpdateDate { get; set; }

    [ForeignKey("IdProfile")]
    [InverseProperty("Users")]
    public virtual Profile? IdProfileNavigation { get; set; }
}
