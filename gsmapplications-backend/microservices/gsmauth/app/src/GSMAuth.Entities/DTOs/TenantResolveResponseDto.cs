using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GSMAuth.Entities.DTOs
{

    public sealed class TenantResolveResponseDto
    {
        public bool TenantExists { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? JsonStyles { get; set; }

    }

}
