using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using HospitalDisplay.Api.DTOs;
using HospitalDisplay.Api.Helpers;
using HospitalDisplay.Api.Interfaces.Service;

namespace HospitalDisplay.Api.Controllers
{
    /// <summary>
    /// Exposes patient registration, management, search and public-dashboard
    /// endpoints. Controllers only orchestrate requests/responses; all logic
    /// lives in IPatientService.
    /// </summary>
    [ApiController]
    [Route("api/patient")]
    [Produces("application/json")]
    public class PatientController : ControllerBase
    {
        private readonly IPatientService _patientService;
        private readonly ILogger<PatientController> _logger;

        public PatientController(IPatientService patientService, ILogger<PatientController> logger)
        {
            _patientService = patientService;
            _logger = logger;
        }

        /// <summary>Registers a new patient.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PatientCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Validation failed", GetModelErrors()));
            }

            try
            {
                var created = await _patientService.CreatePatientAsync(dto);
                return Ok(ApiResponse<PatientResponseDto>.SuccessResponse(created, "Patient registered successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating patient");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"An unexpected error occurred while creating the patient: {ex.Message}"));
            }
        }

        /// <summary>Returns the full list of active patients (staff view).</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var patients = await _patientService.GetAllPatientsAsync();
                return Ok(ApiResponse<object>.SuccessResponse(patients));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching patients");
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while fetching patients."));
            }
        }

        /// <summary>Returns a single patient by Id (staff view).</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var patient = await _patientService.GetPatientByIdAsync(id);
                if (patient == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Patient not found"));
                }
                return Ok(ApiResponse<PatientResponseDto>.SuccessResponse(patient));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching patient {PatientId}", id);
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while fetching the patient."));
            }
        }

        /// <summary>Updates an existing patient record.</summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] PatientUpdateDto dto)
        {
            if (id != dto.PatientId)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Route id and payload PatientId do not match."));
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Validation failed", GetModelErrors()));
            }

            try
            {
                var updated = await _patientService.UpdatePatientAsync(dto);
                if (!updated)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Patient not found"));
                }
                return Ok(ApiResponse<object>.SuccessResponse(null!, "Patient updated successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating patient {PatientId}", id);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"An unexpected error occurred while updating the patient: {ex.Message}"));
            }
        }

        /// <summary>Soft-deletes (deactivates) a patient record.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _patientService.DeletePatientAsync(id);
                if (!deleted)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Patient not found"));
                }
                return Ok(ApiResponse<object>.SuccessResponse(null!, "Patient removed successfully"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting patient {PatientId}", id);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"An unexpected error occurred while deleting the patient: {ex.Message}"));
            }
        }

        /// <summary>
        /// Public, privacy-safe endpoint powering the waiting-area TV dashboard.
        /// Returns only Name, Age, Gender, Admit Time and Criticality.
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var patients = await _patientService.GetDashboardPatientsAsync();
                return Ok(ApiResponse<object>.SuccessResponse(patients));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching dashboard patients");
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while fetching the dashboard."));
            }
        }

        /// <summary>Searches active patients by name/father name keyword, optionally combined with an admit-date range.</summary>
        [HttpGet("search")]
        //public async Task<IActionResult> Search([FromQuery] string? keyword, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        public async Task<IActionResult> Search(
    [FromQuery] string? keyword = null,
    [FromQuery] DateTime? fromDate = null,
    [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var patients = await _patientService.SearchPatientAsync(keyword ?? string.Empty, fromDate, toDate);
                return Ok(ApiResponse<object>.SuccessResponse(patients));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching patients with keyword {Keyword}", keyword);
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while searching patients."));
            }
        }

        /// <summary>Updates only the criticality status of a patient (quick action).</summary>
        [HttpPut("update-criticality")]
        public async Task<IActionResult> UpdateCriticality([FromQuery] int patientId, [FromQuery] string criticality)
        {
            try
            {
                var updated = await _patientService.UpdateCriticalityAsync(patientId, criticality);
                if (!updated)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Patient not found"));
                }
                return Ok(ApiResponse<object>.SuccessResponse(null!, "Criticality updated successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating criticality for patient {PatientId}", patientId);
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while updating criticality."));
            }
        }

        private System.Collections.Generic.List<string> GetModelErrors()
        {
            var errors = new System.Collections.Generic.List<string>();
            foreach (var state in ModelState.Values)
            {
                foreach (var error in state.Errors)
                {
                    errors.Add(error.ErrorMessage);
                }
            }
            return errors;
        }
    }
}
