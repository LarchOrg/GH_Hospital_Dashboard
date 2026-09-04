using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HospitalDisplay.Api.DTOs;

namespace HospitalDisplay.Api.Interfaces.Service
{
    /// <summary>
    /// Business logic contract for patient operations, consumed by controllers.
    /// </summary>
    public interface IPatientService
    {
        Task<PatientResponseDto> CreatePatientAsync(PatientCreateDto dto);
        Task<bool> UpdatePatientAsync(PatientUpdateDto dto);
        Task<bool> DeletePatientAsync(int patientId);
        Task<IEnumerable<PatientResponseDto>> GetAllPatientsAsync();
        Task<PatientResponseDto?> GetPatientByIdAsync(int patientId);
        Task<IEnumerable<DashboardPatientDto>> GetDashboardPatientsAsync();
        Task<IEnumerable<PatientResponseDto>> SearchPatientAsync(string keyword, DateTime? fromDate, DateTime? toDate);
        Task<bool> UpdateCriticalityAsync(int patientId, string criticality);
    }
}
