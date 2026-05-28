namespace GSMApplication.Abstractions;

public interface IRequestContext
{
    string CompanyId { get; }
    int IdProfile { get; }
}