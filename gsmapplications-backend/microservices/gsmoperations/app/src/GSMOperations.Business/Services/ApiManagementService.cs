using GSMOperations.Business.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Web;

namespace GSMOperations.Business.Services;

public sealed class ApiManagementService : IApiManagementService
{
    private readonly HttpClient _httpClient;

    public ApiManagementService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ApiResponse<object>> ExecApi(GenericApiDTO genericApiDTO, CancellationToken cancellationToken = default)
    {
        var apiOperation = genericApiDTO.Operation.Trim().ToUpperInvariant();
        var urlEndPoint = genericApiDTO.UrlEndPoint.Trim();

        if (string.IsNullOrWhiteSpace(urlEndPoint) || string.IsNullOrWhiteSpace(apiOperation))
        {
            return ApiResponse<object>.FailResult(Messages.Operations.EmptyFields, ErrorType.BadRequest);
        }

        return apiOperation switch
        {
            "GET" => await ExecuteGetAsync(urlEndPoint, genericApiDTO.Body, genericApiDTO.Headers, genericApiDTO.Parameters, cancellationToken),

            "POST" => ApiResponse<object>.FailResult("Method not implemented yet.", ErrorType.BadRequest),

            "PUT" => ApiResponse<object>.FailResult("Method not implemented yet.", ErrorType.BadRequest),

            "DELETE" => ApiResponse<object>.FailResult("Method not implemented yet.", ErrorType.BadRequest),

            _ => ApiResponse<object>.FailResult(Messages.Operations.HttpMethodUnknown, ErrorType.BadRequest)
        };
    }

    private async Task<ApiResponse<object>> ExecuteGetAsync(string url, object? body, Dictionary<string, string>? headers,
        Dictionary<string, string>? parameters, CancellationToken cancellationToken)
    {
        var requestUrl = BuildUrl(url, parameters);

        using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);

        AddHeaders(request, headers);

        if (body is not null)
        {
            request.Content = CreateJsonContent(body);
        }

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        return await HandleResponseAsync(response, cancellationToken);  
    }


    private static string BuildUrl(string url, Dictionary<string, string>? parameters)
    {
        if (parameters is null || parameters.Count == 0)
            return url;

        var query = HttpUtility.ParseQueryString(string.Empty);

        foreach (var parameter in parameters)
        {
            query[parameter.Key] = parameter.Value;
        }

        return $"{url}?{query}";
    }

    private static void AddHeaders(HttpRequestMessage request, Dictionary<string, string>? headers)
    {
        if (headers is null || headers.Count == 0)
            return;

        foreach (var header in headers)
        {
            if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase))
                continue;

            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }
    }

    private static StringContent CreateJsonContent(object body)
    {
        return new(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
    }

    private static async Task<ApiResponse<object>> HandleResponseAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            return ApiResponse<object>.FailResult(Messages.Operations.ApiExecutionFailed, MapStatusCodeToErrorType(response.StatusCode), details: responseContent);

        object data = string.Empty;

        if (!string.IsNullOrWhiteSpace(responseContent))
        {
            try { data = JsonSerializer.Deserialize<JsonElement>(responseContent); }
            catch { data = responseContent; }
        }

        return ApiResponse<object>.SuccessResult(data, Messages.Operations.ApiExecutedSuccessfully);
    }

    private static ErrorType MapStatusCodeToErrorType(HttpStatusCode statusCode)
    {
        return statusCode switch
        {
            HttpStatusCode.BadRequest => ErrorType.BadRequest,
            HttpStatusCode.Unauthorized => ErrorType.Unauthorized,
            HttpStatusCode.Forbidden => ErrorType.Forbidden,
            HttpStatusCode.NotFound => ErrorType.NotFound,
            HttpStatusCode.Conflict => ErrorType.Conflict,
            HttpStatusCode.UnprocessableEntity => ErrorType.Validation,
            _ => ErrorType.Internal
        };
    }

}
