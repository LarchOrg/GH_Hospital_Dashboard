using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using HospitalDisplay.Api.Helpers;
using HospitalDisplay.Api.Interfaces.Service;

namespace HospitalDisplay.Api.Controllers
{
    /// <summary>
    /// Manages the images shown full-screen on the public TV dashboard,
    /// interleaved with the safety-awareness rotation. Uploads accept up
    /// to 6 images per request (bulk or single); only the generated file
    /// name is stored in SQL, the binary is written to
    /// wwwroot/uploads/dashboard-images/ and served as a relative URL by
    /// the API's static file middleware.
    /// </summary>
    [ApiController]
    [Route("api/dashboardimage")]
    [Produces("application/json")]
    public class DashboardImageController : ControllerBase
    {
        private readonly IDashboardImageService _imageService;
        private readonly ILogger<DashboardImageController> _logger;

        public DashboardImageController(IDashboardImageService imageService, ILogger<DashboardImageController> logger)
        {
            _imageService = imageService;
            _logger = logger;
        }

        /// <summary>Uploads 1-6 images in a single multipart/form-data request (field name "files").</summary>
        [HttpPost("upload")]
        [RequestSizeLimit(35 * 1024 * 1024)]
        public async Task<IActionResult> Upload([FromForm] List<IFormFile> files)
        {
            try
            {
                var created = await _imageService.UploadImagesAsync(files);
                return Ok(ApiResponse<object>.SuccessResponse(created, "Images uploaded successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading dashboard images");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"An unexpected error occurred while uploading images: {ex.Message}"));
            }
        }

        /// <summary>Returns every active dashboard image, in the order they cycle on the TV.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var images = await _imageService.GetAllImagesAsync();
                return Ok(ApiResponse<object>.SuccessResponse(images));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching dashboard images");
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while fetching images."));
            }
        }

        /// <summary>Removes an image (soft-deletes the record and deletes the file from disk).</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _imageService.DeleteImageAsync(id);
                if (!deleted)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Image not found"));
                }
                return Ok(ApiResponse<object>.SuccessResponse(null!, "Image removed successfully"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting dashboard image {ImageId}", id);
                return StatusCode(500, ApiResponse<object>.FailureResponse("An unexpected error occurred while deleting the image."));
            }
        }
    }
}
