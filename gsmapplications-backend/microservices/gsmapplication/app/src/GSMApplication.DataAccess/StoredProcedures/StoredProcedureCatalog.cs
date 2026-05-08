namespace GSMApplication.DataAccess.StoredProcedures;

public static class StoredProcedureCatalog
{
    public static readonly IReadOnlyDictionary<string, string> Procedures =
        new Dictionary<string, string>
        {
            { "MENUOPTIONS", @"{""NameSp"":""SP_GetProfileOptionsAccess"",""Params"":[{""ParamName"":""@IDrol""}]}"}
        };
}