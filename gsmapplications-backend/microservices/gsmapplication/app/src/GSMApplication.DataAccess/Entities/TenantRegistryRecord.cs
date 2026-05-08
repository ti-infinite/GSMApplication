using System.ComponentModel.DataAnnotations;

namespace GSMApplication.DataAccess.Entities;

public sealed class TenantRegistryRecord
{
    [Required]
    [MaxLength(50)]
    public string CompanyId { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string DbServer { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string DatabaseName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? DbUser { get; set; }

    [MaxLength(255)]
    public string? DbPassword { get; set; }

    public bool IsActive { get; set; }

    public string? JsonStyles { get; set; }
}
