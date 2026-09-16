using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using HospitalDisplay.Api.DTOs;

namespace HospitalDisplay.Api.Interfaces.Service
{
    public interface IDashboardImageService
    {
        Task<List<DashboardImageResponseDto>> UploadImagesAsync(IReadOnlyList<IFormFile> files);
        Task<List<DashboardImageResponseDto>> GetAllImagesAsync();
        Task<bool> DeleteImageAsync(int imageId);
    }
}
