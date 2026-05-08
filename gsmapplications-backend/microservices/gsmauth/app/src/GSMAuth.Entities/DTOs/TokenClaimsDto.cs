using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GSMAuth.Entities.DTOs
{
    public sealed class TokenClaimsDto
    {
        public Guid IdUser { get; set; }
        public string CompanyId { get; set; } = string.Empty;
        public int IdProfile { get; set; }

    }
}
