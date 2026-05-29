
namespace GSMOperations.Entities.DTOs
{
    public class GenericApiDTO
    {
        public required string UrlEndPoint { get; set; }
        public required string Operation {  get; set; }
        public Dictionary<string, string>? Headers { get; set; } = new Dictionary<string, string>();
        public Dictionary<string, string>? Parameters { get; set; } = new Dictionary<string, string>();
        public object? Body { get; set; }
    }
}
