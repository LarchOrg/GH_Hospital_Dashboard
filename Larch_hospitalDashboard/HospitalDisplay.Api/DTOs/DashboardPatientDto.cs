using System;

namespace HospitalDisplay.Api.DTOs
{
    /// <summary>
    /// Patient projection shown on the public waiting-area TV dashboard.
    /// Deliberately excludes internal IDs and any confidential/medical
    /// information; FatherName is included at the hospital's request so
    /// families can confirm the correct card at a glance.
    /// </summary>
    public class DashboardPatientDto
    {
        public string PatientName { get; set; } = string.Empty;
        public string PatientNameTamil { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;

        /// <summary>Tamil-script father/guardian name - same Tamil-toggle fallback pattern as PatientNameTamil.</summary>
        public string FatherNameTamil { get; set; } = string.Empty;

        public DateTime AdmitTime { get; set; }
        public string Criticality { get; set; } = string.Empty;

        /// <summary>Optional progressive status: Ward or Discharged.</summary>
        public string? WardStatus { get; set; }
    }
}
