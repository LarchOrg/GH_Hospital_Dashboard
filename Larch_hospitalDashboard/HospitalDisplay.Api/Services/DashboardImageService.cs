using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using HospitalDisplay.Api.DTOs;
using HospitalDisplay.Api.Interfaces.Repository;
using HospitalDisplay.Api.Interfaces.Service;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Services
{
    /// <summary>
    /// Handles validation, disk storage and DB bookkeeping for the public
    /// TV dashboard's image rotation ("Upload Images" screen). Files are
    /// saved under wwwroot/uploads/dashboard-images/ with a generated,
    /// collision-safe name; only that file name is ever written to SQL.
    /// </summary>
    public class DashboardImageService : IDashboardImageService
    {
        private const int MaxImagesPerUpload = 6;
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB per image

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
        };

        // Relative to wwwroot - also the folder segment used to build the
        // public URL, and the only thing (besides the file name) ever
        // stored in SQL.
        private const string UploadsRelativeFolder = "uploads/dashboard-images";

        private readonly IDashboardImageRepository _repository;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<DashboardImageService> _logger;

        public DashboardImageService(
            IDashboardImageRepository repository,
            IWebHostEnvironment environment,
            ILogger<DashboardImageService> logger)
        {
            _repository = repository;
            _environment = environment;
            _logger = logger;
        }

        public async Task<List<DashboardImageResponseDto>> UploadImagesAsync(IReadOnlyList<IFormFile> files)
        {
            if (files == null || files.Count == 0)
            {
                throw new ArgumentException("Select at least one image to upload.");
            }

            if (files.Count > MaxImagesPerUpload)
            {
                throw new ArgumentException($"You can upload up to {MaxImagesPerUpload} images at a time.");
            }

            foreach (var file in files)
            {
                ValidateFile(file);
            }

            var uploadsFolder = GetUploadsFolderPath();
            Directory.CreateDirectory(uploadsFolder);

            var saved = new List<DashboardImageResponseDto>();

            for (var i = 0; i < files.Count; i++)
            {
                var file = files[i];
                var extension = Path.GetExtension(file.FileName);
                var generatedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
                var destinationPath = Path.Combine(uploadsFolder, generatedName);

                await using (var stream = new FileStream(destinationPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var image = new DashboardImage
                {
                    ImageName = generatedName,
                    OriginalName = Path.GetFileName(file.FileName),
                    DisplayOrder = i
                };

                try
                {
                    var newId = await _repository.InsertImageAsync(image);
                    image.ImageId = newId;
                    image.UploadedDate = DateTime.UtcNow;
                    saved.Add(ToDto(image));
                }
                catch
                {
                    // Roll back the file we just wrote if the DB insert failed,
                    // so we never end up with an orphaned file with no record.
                    TryDeleteFile(destinationPath);
                    throw;
                }
            }

            return saved;
        }

        public async Task<List<DashboardImageResponseDto>> GetAllImagesAsync()
        {
            var images = await _repository.GetAllImagesAsync();
            return images.Select(ToDto).ToList();
        }

        public async Task<bool> DeleteImageAsync(int imageId)
        {
            var existing = await _repository.GetImageByIdAsync(imageId);
            if (existing == null || !existing.IsActive)
            {
                return false;
            }

            var deleted = await _repository.DeleteImageAsync(imageId);
            if (deleted)
            {
                var filePath = Path.Combine(GetUploadsFolderPath(), existing.ImageName);
                TryDeleteFile(filePath);
            }

            return deleted;
        }

        private void ValidateFile(IFormFile file)
        {
            if (file.Length == 0)
            {
                throw new ArgumentException($"'{file.FileName}' is empty.");
            }

            if (file.Length > MaxFileSizeBytes)
            {
                throw new ArgumentException($"'{file.FileName}' exceeds the 5 MB limit per image.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            {
                throw new ArgumentException($"'{file.FileName}' is not a supported image type. Allowed: JPG, JPEG, PNG, GIF, WEBP.");
            }
        }

        private string GetUploadsFolderPath()
        {
            // WebRootPath (wwwroot) may not exist yet in a bare API project -
            // fall back to creating it under ContentRootPath so the app never
            // fails just because the folder wasn't scaffolded.
            var webRoot = _environment.WebRootPath;
            if (string.IsNullOrEmpty(webRoot))
            {
                webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            return Path.Combine(webRoot, UploadsRelativeFolder.Replace('/', Path.DirectorySeparatorChar));
        }

        private void TryDeleteFile(string filePath)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch (Exception ex)
            {
                // Deleting the DB record must not fail just because the file
                // was already removed manually or is locked - log and move on.
                _logger.LogWarning(ex, "Could not delete dashboard image file at {FilePath}", filePath);
            }
        }

        private static DashboardImageResponseDto ToDto(DashboardImage image)
        {
            return new DashboardImageResponseDto
            {
                ImageId = image.ImageId,
                ImageName = image.ImageName,
                OriginalName = image.OriginalName,
                ImageUrl = $"/{UploadsRelativeFolder}/{image.ImageName}",
                DisplayOrder = image.DisplayOrder,
                UploadedDate = image.UploadedDate
            };
        }
    }
}
