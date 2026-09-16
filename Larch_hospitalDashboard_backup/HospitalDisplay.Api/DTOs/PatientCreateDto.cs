using System;
using System.ComponentModel.DataAnnotations;

namespace HospitalDisplay.Api.DTOs
{
    /// <summary>
    /// DTO used when registering a new patient.
    /// </summary>
    public class PatientCreateDto
    {
        [Required(ErrorMessage = "Patient name is required")]
        [StringLength(150)]
        public string PatientName { get; set; } = string.Empty;

        /// <summary>Tamil-script name, shown on the dashboard when Tamil is selected.</summary>
        [Required(ErrorMessage = "Patient name (Tamil) is required")]
        [StringLength(150)]
        public string PatientNameTamil { get; set; } = string.Empty;

        [Required(ErrorMessage = "Age is required")]
        [Range(0, 150, ErrorMessage = "Age must be between 0 and 150")]
        public int Age { get; set; }

        [Required(ErrorMessage = "Gender is required")]
        [StringLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required(ErrorMessage = "Father name is required")]
        [StringLength(150)]
        public string FatherName { get; set; } = string.Empty;

        /// <summary>Tamil-script rendering of the father/guardian's name.</summary>
        [Required(ErrorMessage = "Father name (Tamil) is required")]
        [StringLength(150)]
        public string FatherNameTamil { get; set; } = string.Empty;

        [Required(ErrorMessage = "Admit time is required")]
        public DateTime AdmitTime { get; set; }

        [Required(ErrorMessage = "Criticality is required")]
        [RegularExpression("Stable|Critical|MostCritical|Deceased", ErrorMessage = "Criticality must be Stable, Critical, MostCritical or Deceased")]
        public string Criticality { get; set; } = "Stable";

        /// <summary>Optional progressive status: Ward or Discharged.</summary>
        [RegularExpression("Ward|Discharged", ErrorMessage = "Ward status must be Ward or Discharged")]
        public string? WardStatus { get; set; }

        [StringLength(5)]
        [RegularExpression("^[A-Za-z0-9]{1,5}$", ErrorMessage = "Ward number must be up to 5 letters/numbers")]
        public string? WardNumber { get; set; }
    }
}
