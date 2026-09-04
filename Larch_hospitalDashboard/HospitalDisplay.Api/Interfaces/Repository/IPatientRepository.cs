using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Interfaces.Repository
{
    /// <summary>
    /// Contract for patient data access. All implementations must operate
    /// exclusively through SQL Server stored procedures.
    /// </summary>
    public interface IPatientRepository
    {
        Task<int> InsertPatientAsync(Patient patient);
        Task<bool> UpdatePatientAsync(Patient patient);
        Task<bool> DeletePatientAsync(int patientId);
        Task<IEnumerable<Patient>> GetAllPatientsAsync();
        Task<Patient?> GetPatientByIdAsync(int patientId);
        Task<IEnumerable<Patient>> GetDashboardPatientsAsync();
        Task<IEnumerable<Patient>> SearchPatientAsync(string keyword, DateTime? fromDate, DateTime? toDate);
        Task<bool> UpdateCriticalityAsync(int patientId, string criticality);
    }
}
