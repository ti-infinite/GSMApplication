using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GSMAuth.Entities.DTOs
{

    public sealed class TenantResolveDto
    {
        public bool TenantExists { get; set; }
        public string? JsonStyles { get; set; }

    }

}
