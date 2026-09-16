using AutoMapper;
using HospitalDisplay.Api.DTOs;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Mappings
{
    /// <summary>
    /// AutoMapper configuration mapping between the Patient entity and its
    /// various DTO representations.
    /// </summary>
    public class AutoMapperProfile : Profile
    {
        public AutoMapperProfile()
        {
            CreateMap<PatientCreateDto, Patient>();
            CreateMap<PatientUpdateDto, Patient>();
            CreateMap<Patient, PatientResponseDto>();

            // Public dashboard projection - excludes internal IDs and any
            // confidential/medical information. FatherName is included by
            // request so families can confirm the right card at a glance.
            CreateMap<Patient, DashboardPatientDto>();
        }
    }
}
