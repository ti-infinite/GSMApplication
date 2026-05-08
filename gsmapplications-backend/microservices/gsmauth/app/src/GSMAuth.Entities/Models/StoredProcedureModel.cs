namespace GSMAuth.Entities.Models
{
    public sealed class StoredProcedureModel
    {
        public string Name { get; }
        public IReadOnlyDictionary<string, object?> Parameters { get; }

        public StoredProcedureModel(string name, IReadOnlyDictionary<string, object?>? parameters = null)
        {
            Name = name;
            Parameters = parameters ?? new Dictionary<string, object?>();
        }

    }
}
