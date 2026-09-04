using System;

namespace HospitalDisplay.Api.DTOs
{
    /// <summary>
    /// Client-facing projection of a dashboard image. ImageUrl is a
    /// relative path (never an absolute server path) that the API's
    /// static file middleware serves directly - the frontend prefixes it
    /// with the API's origin at render time.
    /// </summary>
    public class DashboardImageResponseDto
    {
        public int ImageId { get; set; }
        public string ImageName { get; set; } = string.Empty;
        public string? OriginalName { get; set; }

        /// <summary>Relative URL, e.g. "/uploads/dashboard-images/{ImageName}".</summary>
        public string ImageUrl { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }
        public DateTime UploadedDate { get; set; }
    }
}
