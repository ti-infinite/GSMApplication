using System.ComponentModel.DataAnnotations;

namespace GSMAuth.Entities.DTOs
{
    public sealed class TenantResolveRequestDto
    {
        [Required]
        public string IDCompany { get; set; } = string.Empty;
    }
}
