using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GSMAuth.Entities.Models;

[Table("Users", Schema = "db_ms")]
public sealed class User
{
    [Key]
    public Guid IdUser { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    public int IdProfile { get; set; }

    public bool PasswordChangeRequired { get; set; }

    [MaxLength(100)]
    public string Location { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    [Required]
    [MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime? LastSessionDate { get; set; }    
    public DateTime? PasswordUpdateDate { get; set; }
}
