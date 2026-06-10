using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GSMAuth.Entities.DTOs
{
    public sealed class AuthenticatedUserDto
    {
        public Guid IdUser { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int IdProfile { get; set; }
        public bool PasswordChangeRequired { get; set; }
        public string? Location { get; set; }
        public string Department { get; set; } = string.Empty;

    }
}
