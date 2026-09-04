using System;

namespace HospitalDisplay.Api.Models
{
    /// <summary>
    /// Represents one image shown full-screen on the public TV dashboard,
    /// interleaved with the safety-awareness rotation. Only the generated
    /// file name is persisted here - the binary lives on disk under
    /// wwwroot/uploads/dashboard-images/.
    /// </summary>
    public class DashboardImage
    {
        public int ImageId { get; set; }

        /// <summary>Generated, collision-safe file name on disk (e.g. a GUID + original extension).</summary>
        public string ImageName { get; set; } = string.Empty;

        /// <summary>Original file name the user selected, kept for reference/display only.</summary>
        public string? OriginalName { get; set; }

        /// <summary>Upload order - determines the sequence images cycle through on the dashboard.</summary>
        public int DisplayOrder { get; set; }

        public DateTime UploadedDate { get; set; }
        public bool IsActive { get; set; }
    }
}
