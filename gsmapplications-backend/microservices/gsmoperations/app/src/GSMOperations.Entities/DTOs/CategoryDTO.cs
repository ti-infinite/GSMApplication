namespace GSMOperations.Entities.DTOs;

public class CategoryDTO
{
    public int IdCategory { get; set; }

    public string Descr { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string AggregatedCode { get; set; } = string.Empty;

    public bool IsSKU { get; set; }

    public int IdSKUTemplate { get; set; }

    public List<CategoryDTO>? Children { get; set; }
}