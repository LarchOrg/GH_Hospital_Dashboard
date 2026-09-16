using System;

namespace HospitalDisplay.Api.DTOs
{
    /// <summary>
    /// Full patient details returned to internal (staff-facing) screens such as the registration form and management grid.
    /// </summary>
    public class PatientResponseDto
    {
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PatientNameTamil { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string FatherNameTamil { get; set; } = string.Empty;
        public DateTime AdmitTime { get; set; }
        public string Criticality { get; set; } = string.Empty;
        public string? WardStatus { get; set; }
        public string? WardNumber { get; set; }

        public DateTime? WardStatusChangedDate { get; set; }
        public DateTime? DeceasedAt { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool IsActive { get; set; }
    }
}
