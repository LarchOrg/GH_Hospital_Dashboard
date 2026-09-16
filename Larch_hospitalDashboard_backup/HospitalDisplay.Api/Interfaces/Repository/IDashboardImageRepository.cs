using System.Collections.Generic;
using System.Threading.Tasks;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Interfaces.Repository
{
    /// <summary>
    /// Contract for dashboard image data access. All implementations must
    /// operate exclusively through SQL Server stored procedures.
    /// </summary>
    public interface IDashboardImageRepository
    {
        Task<int> InsertImageAsync(DashboardImage image);
        Task<IEnumerable<DashboardImage>> GetAllImagesAsync();
        Task<DashboardImage?> GetImageByIdAsync(int imageId);
        Task<bool> DeleteImageAsync(int imageId);
    }
}
