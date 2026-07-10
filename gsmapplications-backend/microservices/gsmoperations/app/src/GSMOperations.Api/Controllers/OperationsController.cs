using GSMOperations.Business.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using Microsoft.AspNetCore.Mvc;

namespace GSMOperations.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class OperationsController : ControllerBase
{
    private readonly IManageTransactionService _manageTransactionService;
    private readonly IResourceExecutorService _resourceExecutorService;


    public OperationsController(IManageTransactionService manageTransactionService, IResourceExecutorService resourceExecutorService)
    {
        _manageTransactionService = manageTransactionService;
        _resourceExecutorService = resourceExecutorService;
    }


    [HttpPost("create-trx")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateTransaction([FromBody] TrxCreateDTO  request, CancellationToken cancellationToken)
    {
        var response = await _manageTransactionService.CreateTransaction(request, cancellationToken);
        return Ok(response);
    }

    [HttpPatch("{idTrxHeader:long}")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateTransaction(long idTrxHeader, [FromBody] TrxUpdateDTO updateRequest, CancellationToken cancellationToken)
    {
        var response = await _manageTransactionService.UpdateTrx(idTrxHeader, updateRequest, cancellationToken);
        return Ok(response);
    }

    [HttpPost("filtered-trx")]
    [ProducesResponseType(typeof(ApiResponse<List<TrxResponseDTO>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransaction([FromBody] SearchTrx? searchTrx, CancellationToken cancellationToken)
    {
        var response = await _manageTransactionService.GetTrx(searchTrx, cancellationToken);
        return Ok(response);
    }

    [HttpPost("filtered-trxDefinitions")]
    [ProducesResponseType(typeof(ApiResponse<List<TrxDefinitionDTO>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFilteredTrxDefinitions([FromBody] SearchTrxDefinition? searchCriteria, CancellationToken cancellationToken)
    {
        var response = await _manageTransactionService.GetFilteredTrxDefinition(searchCriteria, cancellationToken);
        return Ok(response);
    }

    [HttpPost("execute-trxResource/{resourceEvent}")]
    public async Task<IActionResult> ExecuteTrxResource([FromRoute] string resourceEvent, [FromBody] Dictionary<string, object> parameters, CancellationToken cancellationToken)
    {
        var response = await _resourceExecutorService.ExecuteAsync(resourceEvent, parameters, cancellationToken);
        return Ok(response);
    }


}
