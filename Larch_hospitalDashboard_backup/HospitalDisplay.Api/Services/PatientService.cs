using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.Extensions.Logging;
using HospitalDisplay.Api.DTOs;
using HospitalDisplay.Api.Interfaces.Repository;
using HospitalDisplay.Api.Interfaces.Service;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Services
{
    /// <summary>
    /// Business logic layer for patient operations. Controllers depend only
    /// on IPatientService; all data access is delegated to IPatientRepository.
    /// </summary>
    public class PatientService : IPatientService
    {
        private readonly IPatientRepository _repository;
        private readonly IMapper _mapper;
        private readonly ILogger<PatientService> _logger;

        private static readonly HashSet<string> ValidCriticalities = new(StringComparer.OrdinalIgnoreCase)
        {
            "Stable", "Critical", "MostCritical", "Deceased"
        };

        private static readonly HashSet<string> ValidWardStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Ward", "Discharged"
        };

        public PatientService(IPatientRepository repository, IMapper mapper, ILogger<PatientService> logger)
        {
            _repository = repository;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<PatientResponseDto> CreatePatientAsync(PatientCreateDto dto)
        {
            ValidateCriticality(dto.Criticality);
            ValidateWardStatus(dto.WardStatus);

            var patient = _mapper.Map<Patient>(dto);
            var newId = await _repository.InsertPatientAsync(patient);
            _logger.LogInformation("Patient created with Id {PatientId}", newId);

            var created = await _repository.GetPatientByIdAsync(newId)
                ?? throw new InvalidOperationException("Patient was created but could not be retrieved.");

            return _mapper.Map<PatientResponseDto>(created);
        }

        public async Task<bool> UpdatePatientAsync(PatientUpdateDto dto)
        {
            ValidateCriticality(dto.Criticality);
            ValidateWardStatus(dto.WardStatus);

            var existing = await _repository.GetPatientByIdAsync(dto.PatientId);
            if (existing == null)
            {
                _logger.LogWarning("Attempted to update non-existent patient {PatientId}", dto.PatientId);
                return false;
            }

            var patient = _mapper.Map<Patient>(dto);
            var updated = await _repository.UpdatePatientAsync(patient);

            if (!updated)
            {
                // The record was found a moment ago but the UPDATE affected
                // no rows - this indicates a genuine data-layer problem
                // (e.g. deleted concurrently) rather than a bad request, so
                // it's logged distinctly from the "not found" case above.
                _logger.LogError("Patient {PatientId} existed but the update affected 0 rows", dto.PatientId);
            }

            return updated;
        }

        public async Task<bool> DeletePatientAsync(int patientId)
        {
            return await _repository.DeletePatientAsync(patientId);
        }

        public async Task<IEnumerable<PatientResponseDto>> GetAllPatientsAsync()
        {
            var patients = await _repository.GetAllPatientsAsync();
            return patients.Select(p => _mapper.Map<PatientResponseDto>(p));
        }

        public async Task<PatientResponseDto?> GetPatientByIdAsync(int patientId)
        {
            var patient = await _repository.GetPatientByIdAsync(patientId);
            return patient == null ? null : _mapper.Map<PatientResponseDto>(patient);
        }

        public async Task<IEnumerable<DashboardPatientDto>> GetDashboardPatientsAsync()
        {
            var patients = await _repository.GetDashboardPatientsAsync();
            // Only non-confidential fields are mapped here - see AutoMapperProfile
            // and DashboardPatientDto for the enforced public-safe projection.
            return patients.Select(p => _mapper.Map<DashboardPatientDto>(p));
        }

        public async Task<IEnumerable<PatientResponseDto>> SearchPatientAsync(string keyword, DateTime? fromDate, DateTime? toDate)
        {
            var patients = await _repository.SearchPatientAsync(keyword, fromDate, toDate);
            return patients.Select(p => _mapper.Map<PatientResponseDto>(p));
        }

        public async Task<bool> UpdateCriticalityAsync(int patientId, string criticality)
        {
            ValidateCriticality(criticality);
            return await _repository.UpdateCriticalityAsync(patientId, criticality);
        }

        private static void ValidateCriticality(string criticality)
        {
            if (!ValidCriticalities.Contains(criticality))
            {
                throw new ArgumentException($"Invalid criticality value '{criticality}'. Must be Stable, Critical, MostCritical or Deceased.");
            }
        }

        private static void ValidateWardStatus(string? wardStatus)
        {
            // Optional field - null/empty is valid (no ward status set yet).
            if (string.IsNullOrWhiteSpace(wardStatus))
            {
                return;
            }

            if (!ValidWardStatuses.Contains(wardStatus))
            {
                throw new ArgumentException($"Invalid ward status value '{wardStatus}'. Must be Ward or Discharged.");
            }
        }
    }
}
