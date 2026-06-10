using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GSMAuth.DataAccess.Entities;


[Table("Users", Schema = "db_ms")]
public sealed class User
{
    [Key]
    public Guid IdUser { get; set; }

    [MaxLength(100)]
    public required string Username { get; set; }

    [MaxLength(100)]
    public required string FirstName { get; set; }

    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(200)]
    public required string FullName { get; set; }

    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    public required int IdProfile { get; set; }

    public bool PasswordChangeRequired { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    public bool IsActive { get; set; }

    [MaxLength(500)]
    public required string PasswordHash { get; set; }
    public DateTime? LastSessionDate { get; set; }    
    public DateTime? PasswordUpdateDate { get; set; }
}
