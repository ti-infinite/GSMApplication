using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using GSOperations.Entities.Models;
using Microsoft.AspNetCore.Mvc;

namespace GSMOperations.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class ResourcesController : ControllerBase
{
    private readonly IGlobalAndParamAttributeService _paramAttributeService;
    private readonly IMasterHerbsService _masterHerbsService;
    private readonly IEmployeesService _employeesService;
    private readonly ISuppliersService _suppliersService;
    private readonly ICategoriesService _categoriesService;
    private readonly ISkuDefinitionsService _skuDefinitionsService;
    private readonly IVarietyCostBySupplierService _varietyCostService;


    public ResourcesController(IGlobalAndParamAttributeService paramAttributeService, IMasterHerbsService masterHerbsService, 
        IEmployeesService employeesService, ISuppliersService suppliersService, ICategoriesService categoriesService,
        ISkuDefinitionsService skuDefinitionsService,
        IVarietyCostBySupplierService varietyCostService)
    {
        _paramAttributeService = paramAttributeService;
        _masterHerbsService = masterHerbsService;
        _employeesService = employeesService;
        _suppliersService = suppliersService;
        _categoriesService = categoriesService;
        _skuDefinitionsService = skuDefinitionsService; 
        _varietyCostService = varietyCostService;
    }


    [HttpGet("parameters")]
    [ProducesResponseType(typeof(ApiResponse<List<GlobalParameter>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<GlobalParameter>>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetParameters(CancellationToken cancellationToken)
    {
        var response = await _paramAttributeService.GetAllParamAttributes(cancellationToken);
        return Ok(response);
    }

    [HttpGet("master-products")]
    [ProducesResponseType(typeof(ApiResponse<List<MasterProductDTO>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<MasterProductDTO>>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMasterProducts(CancellationToken cancellationToken)
    {
        var response = await _masterHerbsService.GetMasterProducts(cancellationToken);
        return Ok(response);
    }

    [HttpPost("filtered-employees")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeDTO>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFilteredEmployees([FromBody] SearchEmployee? searchCriteria, CancellationToken cancellationToken)
    {
        var response = await _employeesService.GetFilteredEmployees(searchCriteria, cancellationToken);
        return Ok(response);
    }

    [HttpPost("filtered-suppliers")]
    [ProducesResponseType(typeof(ApiResponse<List<SupplierDTO>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFilteredSuppliers([FromBody] SearchSupplier? searchCriteria, CancellationToken cancellationToken)
    {
        var response = await _suppliersService.GetFilteredSuppliers(searchCriteria, cancellationToken);
        return Ok(response);
    }

    [HttpGet("categories")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken)
    {
        var response = await _categoriesService.GetCategories(cancellationToken);
        return Ok(response);
    }

    [HttpGet("sku-definitions")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSkuDefinitions(CancellationToken cancellationToken)
    {
        var response = await _skuDefinitionsService.GetSkuDefinitions(cancellationToken);
        return Ok(response);
    }

    [HttpPost("filtered-varieties")]
    [ProducesResponseType(typeof(ApiResponse<List<VarietyCostBySupplierDTO>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFilteredVarieties([FromBody] SearchVarietyCost? searchCriteria, CancellationToken cancellationToken)
    {
        var response = await _varietyCostService.GetFilteredVarietyCost(searchCriteria, cancellationToken);
        return Ok(response);
    }

}