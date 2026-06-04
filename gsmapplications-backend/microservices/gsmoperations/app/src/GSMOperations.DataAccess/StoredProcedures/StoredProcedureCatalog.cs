

namespace GSMOperations.DataAccess.StoredProcedures
{
    public static class StoredProcedureCatalog
    {
        public static readonly IReadOnlyDictionary<string, string> Procedures =
            new Dictionary<string, string>
            {
                    { "CATEGORIES", @"{""NameSp"":""SP_GetCategories"",""Params"":[]}"},
                    { "SKUDEFINITIONS", @"{""NameSp"":""SP_GetSkuDefinition"",""Params"":[]}"},
                    { "GETTRXNUMBER", @"{""NameSp"":""SP_GetNextTrxNumber"",""Params"":[{""ParamName"":""@Prefix""}]}"},
            };
    }
}
