namespace GSMOperations.Entities.DTOs;

public sealed class GlobalParameterDTO
{
    public int IdParameter { get; set; }
    public string ParamCategory { get; set; } = null!;
    public string? ShortName { get; set; }
    public string? Descr { get; set; }
    public List<ParamAttributeDTO> ParamAttributes { get; set; } = new List<ParamAttributeDTO>();
}