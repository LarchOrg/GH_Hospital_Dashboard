using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HospitalDisplay.Api.Data;
using HospitalDisplay.Api.Interfaces.Repository;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Repository
{
    /// <summary>
    /// Data access implementation for DashboardImage records.
    /// Every operation is executed exclusively through SQL Server stored
    /// procedures - no LINQ CRUD and no inline SQL is used anywhere here.
    /// </summary>
    public class DashboardImageRepository : IDashboardImageRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DashboardImageRepository> _logger;

        public DashboardImageRepository(AppDbContext context, ILogger<DashboardImageRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        private SqlConnection GetConnection() => (SqlConnection)_context.Database.GetDbConnection();

        public async Task<int> InsertImageAsync(DashboardImage image)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_InsertDashboardImage", connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            command.Parameters.AddWithValue("@ImageName", image.ImageName);
            command.Parameters.AddWithValue("@OriginalName", (object?)image.OriginalName ?? DBNull.Value);
            command.Parameters.AddWithValue("@DisplayOrder", image.DisplayOrder);

            var newIdParam = new SqlParameter("@NewImageId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            command.Parameters.Add(newIdParam);

            await EnsureOpenAsync(connection);
            try
            {
                await command.ExecuteNonQueryAsync();
                return (int)newIdParam.Value;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<IEnumerable<DashboardImage>> GetAllImagesAsync()
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_GetAllDashboardImages", connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            await EnsureOpenAsync(connection);
            try
            {
                return await ReadImagesAsync(command);
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<DashboardImage?> GetImageByIdAsync(int imageId)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_GetDashboardImageById", connection)
            {
                CommandType = CommandType.StoredProcedure
            };
            command.Parameters.AddWithValue("@ImageId", imageId);

            await EnsureOpenAsync(connection);
            try
            {
                var images = await ReadImagesAsync(command);
                var enumerator = images.GetEnumerator();
                return enumerator.MoveNext() ? enumerator.Current : null;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        // DeleteImageAsync uses ExecuteScalarAsync (not ExecuteNonQueryAsync)
        // because sp_DeleteDashboardImage ends with
        // "SELECT @@ROWCOUNT AS RowsAffected;" - matching the same
        // tested pattern used by sp_UpdatePatient/sp_DeletePatient.
        public async Task<bool> DeleteImageAsync(int imageId)
        {
            var connection = GetConnection();

            await using var command = new SqlCommand(
                "sp_DeleteDashboardImage",
                connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            command.Parameters.Add("@ImageId", SqlDbType.Int).Value = imageId;

            await EnsureOpenAsync(connection);

            try
            {
                var result = await command.ExecuteScalarAsync();

                return result != null && Convert.ToInt32(result) > 0;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        /// <summary>
        /// Reads all rows from a data-returning stored procedure command into DashboardImage objects.
        /// </summary>
        private static async Task<IEnumerable<DashboardImage>> ReadImagesAsync(SqlCommand command)
        {
            var results = new List<DashboardImage>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new DashboardImage
                {
                    ImageId = reader.GetInt32(reader.GetOrdinal("ImageId")),
                    ImageName = reader.GetString(reader.GetOrdinal("ImageName")),
                    OriginalName = reader.IsDBNull(reader.GetOrdinal("OriginalName")) ? null : reader.GetString(reader.GetOrdinal("OriginalName")),
                    DisplayOrder = reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
                    UploadedDate = reader.GetDateTime(reader.GetOrdinal("UploadedDate")),
                    IsActive = reader.GetBoolean(reader.GetOrdinal("IsActive"))
                });
            }
            return results;
        }

        /// <summary>
        /// Opens the connection through EF Core's own connection management
        /// (rather than calling SqlConnection.OpenAsync directly) so the
        /// DbContext's internal open/close tracking stays consistent even
        /// though every query here is raw ADO.NET / stored-procedure based.
        /// </summary>
        private Task EnsureOpenAsync(SqlConnection _) => _context.Database.OpenConnectionAsync();

        private Task CloseAsync(SqlConnection _) => _context.Database.CloseConnectionAsync();
    }
}
