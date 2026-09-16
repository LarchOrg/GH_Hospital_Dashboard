using System;

namespace HospitalDisplay.Api.Models
{
    /// <summary>
    /// Represents a patient record in the Emergency & Accident Ward.
    /// </summary>
    public class Patient
    {
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;

        /// <summary>
        /// Tamil-script rendering of the patient's name, entered by staff at
        /// registration time. Free-text names cannot be machine-translated
        /// automatically (they're proper nouns, not dictionary words), so
        /// this is what the TV dashboard shows when the visitor toggles to
        /// Tamil. Required, same as PatientName.
        /// </summary>
        public string PatientNameTamil { get; set; } = string.Empty;

        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;

        /// <summary>Tamil-script rendering of the father/guardian's name. Required, same as FatherName.</summary>
        public string FatherNameTamil { get; set; } = string.Empty;

        public DateTime AdmitTime { get; set; }

        /// <summary>
        /// Criticality status: Stable, Critical, MostCritical, Deceased
        /// </summary>
        public string Criticality { get; set; } = "Stable";

        /// <summary>
        /// Optional progressive status: Ward (still admitted) or Discharged.
        /// Independent of Criticality - shown on both the staff grid and the
        /// public TV dashboard card.
        /// </summary>
        public string? WardStatus { get; set; }

        /// <summary>
        /// UTC timestamp of the last time WardStatus actually changed value
        /// (maintained by a database trigger, not by application code).
        /// Drives the "Ward Change / Discharged patients only stay on the
        /// public dashboard for 10 minutes" rule - null means WardStatus
        /// has never been set, in which case there's no time restriction.
        /// </summary>
        public DateTime? WardStatusChangedDate { get; set; }
        public string? WardNumber { get; set; }


        /// <summary>
        /// UTC timestamp of the moment Criticality last transitioned TO
        /// 'Deceased' (maintained by a database trigger, not by application
        /// code). Drives the "Deceased patients only stay on the public
        /// dashboard for 10 minutes" rule - null means either the patient
        /// isn't Deceased, or they were marked Deceased before this column
        /// existed, in which case there's no time window and they simply
        /// don't appear on the dashboard (matching the original behaviour).
        /// </summary>
        public DateTime? DeceasedAt { get; set; }

        public DateTime CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
