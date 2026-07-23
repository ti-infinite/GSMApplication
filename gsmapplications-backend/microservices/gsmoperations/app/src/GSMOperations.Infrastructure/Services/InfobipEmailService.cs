using System.Net.Http.Json;
using GSMOperations.Abstractions;
using GSMOperations.Entities.Models.Events;

namespace GSMOperations.Infrastructure.Services;

public sealed class InfobipEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    public InfobipEmailService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task SendAsync(EmailRequest request, CancellationToken cancellationToken)
    {
        var apiKey = "";
        var url = "https://nm4np8.api.infobip.com/email/4/messages";

        var payload = new
        {
            messages = new[]
            {
                new
                {
                    sender = request.From,
                    destinations = new[]
                    {
                        new
                        {
                            to = request.To.Select(x => new
                            {
                                destination = x
                            })                           
                        }
                    },
                    content = new
                    {
                        subject = request.Subject,
                        text = request.Body
                    }
                }
            }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Add("Authorization", $"App {apiKey}");
        httpRequest.Headers.Add("Accept", "application/json");

        httpRequest.Content = JsonContent.Create(payload);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}