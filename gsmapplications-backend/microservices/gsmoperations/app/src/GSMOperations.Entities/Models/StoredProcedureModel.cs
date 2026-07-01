namespace GSMOperations.Entities.Models
{
    public sealed class StoredProcedureModel
    {
        public string Name { get; }
        public Dictionary<string, object?> Parameters { get; }

        public StoredProcedureModel(string name)
        {
            Name = name;
            Parameters = new Dictionary<string, object?>();
        }

        public StoredProcedureModel(string name, Dictionary<string, object?> parameters)
        {
            Name = name;
            Parameters = parameters ?? new Dictionary<string, object?>();
        }

        public void AddParameter(string key, object? value)
        {
            Parameters[key] = value;
        }
    }
}