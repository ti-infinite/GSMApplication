using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.Entities;

[Table("Employees", Schema = "db_ms")]
public partial class Employee
{
    [Key]
    public int IdEmployee { get; set; }

    [StringLength(30)]
    [Unicode(false)]
    public string FirstName { get; set; } = null!;

    [StringLength(30)]
    [Unicode(false)]
    public string? LastName { get; set; }

    [StringLength(61)]
    [Unicode(false)]
    public string FullName { get; set; } = null!;

    [StringLength(10)]
    [Unicode(false)]
    public string? Location { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? ContactNumber { get; set; }

    [StringLength(100)]
    public string? Email { get; set; }

    public bool IsActive { get; set; }
}
