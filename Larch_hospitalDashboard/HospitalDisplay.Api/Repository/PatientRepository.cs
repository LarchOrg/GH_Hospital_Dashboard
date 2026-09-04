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
    /// Data access implementation for Patient records.
    /// Every operation is executed exclusively through SQL Server stored
    /// procedures - no LINQ CRUD and no inline SQL is used anywhere here.
    /// </summary>
    public class PatientRepository : IPatientRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PatientRepository> _logger;

        public PatientRepository(AppDbContext context, ILogger<PatientRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        private SqlConnection GetConnection() => (SqlConnection)_context.Database.GetDbConnection();

        public async Task<int> InsertPatientAsync(Patient patient)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_InsertPatient", connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            command.Parameters.AddWithValue("@PatientName", patient.PatientName);
            command.Parameters.AddWithValue("@PatientNameTamil", patient.PatientNameTamil);
            command.Parameters.AddWithValue("@Age", patient.Age);
            command.Parameters.AddWithValue("@Gender", patient.Gender);
            command.Parameters.AddWithValue("@FatherName", patient.FatherName);
            command.Parameters.AddWithValue("@FatherNameTamil", patient.FatherNameTamil);
            command.Parameters.AddWithValue("@AdmitTime", patient.AdmitTime);
            command.Parameters.AddWithValue("@Criticality", patient.Criticality);
            command.Parameters.AddWithValue("@WardStatus", (object?)patient.WardStatus ?? DBNull.Value);

            var newIdParam = new SqlParameter("@NewPatientId", SqlDbType.Int)
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

        public async Task<bool> UpdatePatientAsync(Patient patient)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_UpdatePatient", connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            command.Parameters.AddWithValue("@PatientId", patient.PatientId);
            command.Parameters.AddWithValue("@PatientName", patient.PatientName);
            command.Parameters.AddWithValue("@PatientNameTamil", patient.PatientNameTamil);
            command.Parameters.AddWithValue("@Age", patient.Age);
            command.Parameters.AddWithValue("@Gender", patient.Gender);
            command.Parameters.AddWithValue("@FatherName", patient.FatherName);
            command.Parameters.AddWithValue("@FatherNameTamil", patient.FatherNameTamil);
            command.Parameters.AddWithValue("@AdmitTime", patient.AdmitTime);
            command.Parameters.AddWithValue("@Criticality", patient.Criticality);
            command.Parameters.AddWithValue("@WardStatus", (object?)patient.WardStatus ?? DBNull.Value);

            await EnsureOpenAsync(connection);
            try
            {
                var result = await command.ExecuteScalarAsync();
                var rows = result != null ? Convert.ToInt32(result) : 0;
                return rows > 0;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<bool> DeletePatientAsync(int patientId)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_DeletePatient", connection)
            {
                CommandType = CommandType.StoredProcedure
            };
            command.Parameters.AddWithValue("@PatientId", patientId);

            await EnsureOpenAsync(connection);
            try
            {
                var result = await command.ExecuteScalarAsync();
                var rows = result != null ? Convert.ToInt32(result) : 0;
                return rows > 0;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<IEnumerable<Patient>> GetAllPatientsAsync()
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_GetAllPatients", connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            await EnsureOpenAsync(connection);
            try
            {
                return await ReadPatientsAsync(command);
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<Patient?> GetPatientByIdAsync(int patientId)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_GetPatientById", connection)
            {
                CommandType = CommandType.StoredProcedure
            };
            command.Parameters.AddWithValue("@PatientId", patientId);

            await EnsureOpenAsync(connection);
            try
            {
                var patients = await ReadPatientsAsync(command);
                var enumerator = patients.GetEnumerator();
                return enumerator.MoveNext() ? enumerator.Current : null;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<IEnumerable<Patient>> GetDashboardPatientsAsync()
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_GetDashboardPatients", connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            await EnsureOpenAsync(connection);
            try
            {
                return await ReadPatientsAsync(command);
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<IEnumerable<Patient>> SearchPatientAsync(string keyword, DateTime? fromDate, DateTime? toDate)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_SearchPatient", connection)
            {
                CommandType = CommandType.StoredProcedure
            };
            command.Parameters.AddWithValue("@Keyword", (object?)keyword ?? DBNull.Value);
            command.Parameters.AddWithValue("@FromDate", (object?)fromDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@ToDate", (object?)toDate ?? DBNull.Value);

            await EnsureOpenAsync(connection);
            try
            {
                return await ReadPatientsAsync(command);
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        public async Task<bool> UpdateCriticalityAsync(int patientId, string criticality)
        {
            var connection = GetConnection();
            await using var command = new SqlCommand("sp_UpdateCriticality", connection)
            {
                CommandType = CommandType.StoredProcedure
            };
            command.Parameters.AddWithValue("@PatientId", patientId);
            command.Parameters.AddWithValue("@Criticality", criticality);

            await EnsureOpenAsync(connection);
            try
            {
                var rows = await command.ExecuteNonQueryAsync();
                return rows > 0;
            }
            finally
            {
                await CloseAsync(connection);
            }
        }

        /// <summary>
        /// Reads all rows from a data-returning stored procedure command into Patient objects.
        /// </summary>
        private static async Task<IEnumerable<Patient>> ReadPatientsAsync(SqlCommand command)
        {
            var results = new List<Patient>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new Patient
                {
                    PatientId = reader.GetInt32(reader.GetOrdinal("PatientId")),
                    PatientName = reader.GetString(reader.GetOrdinal("PatientName")),
                    PatientNameTamil = reader.GetString(reader.GetOrdinal("PatientNameTamil")),
                    Age = reader.GetInt32(reader.GetOrdinal("Age")),
                    Gender = reader.GetString(reader.GetOrdinal("Gender")),
                    FatherName = reader.GetString(reader.GetOrdinal("FatherName")),
                    FatherNameTamil = reader.GetString(reader.GetOrdinal("FatherNameTamil")),
                    AdmitTime = reader.GetDateTime(reader.GetOrdinal("AdmitTime")),
                    Criticality = reader.GetString(reader.GetOrdinal("Criticality")),
                    WardStatus = reader.IsDBNull(reader.GetOrdinal("WardStatus")) ? null : reader.GetString(reader.GetOrdinal("WardStatus")),
                    WardStatusChangedDate = reader.IsDBNull(reader.GetOrdinal("WardStatusChangedDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("WardStatusChangedDate")),
                    DeceasedAt = reader.IsDBNull(reader.GetOrdinal("DeceasedAt")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("DeceasedAt")),
                    CreatedDate = reader.GetDateTime(reader.GetOrdinal("CreatedDate")),
                    ModifiedDate = reader.IsDBNull(reader.GetOrdinal("ModifiedDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("ModifiedDate")),
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
