using Microsoft.EntityFrameworkCore;
using HospitalDisplay.Api.Models;

namespace HospitalDisplay.Api.Data
{
    /// <summary>
    /// EF Core database context. Used only for connection/model metadata and
    /// to enable ADO.NET stored-procedure execution through the underlying
    /// connection; no LINQ CRUD is performed against this context.
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Patient> Patients { get; set; } = null!;
        public DbSet<DashboardImage> DashboardImages { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Patient>(entity =>
            {
                entity.ToTable("PatientMaster");
                entity.HasKey(p => p.PatientId);
                entity.Property(p => p.PatientName).HasMaxLength(150).IsRequired();
                entity.Property(p => p.PatientNameTamil).HasMaxLength(150);
                entity.Property(p => p.Gender).HasMaxLength(20).IsRequired();
                entity.Property(p => p.FatherName).HasMaxLength(150);
                entity.Property(p => p.Criticality).HasMaxLength(20).IsRequired();
                entity.Property(p => p.WardStatus).HasMaxLength(20);
            });

            modelBuilder.Entity<DashboardImage>(entity =>
            {
                entity.ToTable("DashboardImageMaster");
                entity.HasKey(i => i.ImageId);
                entity.Property(i => i.ImageName).HasMaxLength(255).IsRequired();
                entity.Property(i => i.OriginalName).HasMaxLength(255);
            });
        }
    }
}
