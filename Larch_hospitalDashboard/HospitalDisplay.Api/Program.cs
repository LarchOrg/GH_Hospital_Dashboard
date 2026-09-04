using System.IO;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using HospitalDisplay.Api.Data;
using HospitalDisplay.Api.Interfaces.Repository;
using HospitalDisplay.Api.Interfaces.Service;
using HospitalDisplay.Api.Mappings;
using HospitalDisplay.Api.Repository;
using HospitalDisplay.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------------------------------------------------
// Logging
// -----------------------------------------------------------------------
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// -----------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// -----------------------------------------------------------------------
// Dependency Injection - Repository & Service layers
// -----------------------------------------------------------------------
builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IDashboardImageRepository, DashboardImageRepository>();
builder.Services.AddScoped<IDashboardImageService, DashboardImageService>();

// -----------------------------------------------------------------------
// AutoMapper
// -----------------------------------------------------------------------
builder.Services.AddAutoMapper(typeof(AutoMapperProfile));

// -----------------------------------------------------------------------
// Controllers & JSON options
// -----------------------------------------------------------------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// -----------------------------------------------------------------------
// CORS - allow the React TV-dashboard / registration app to call the API
// -----------------------------------------------------------------------
const string CorsPolicyName = "HospitalDisplayCorsPolicy";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(
                builder.Configuration
                    .GetSection("AllowedOrigins")
                    .Get<string[]>()
                    ?? new[] { "http://localhost:5173" })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// -----------------------------------------------------------------------
// Swagger
// -----------------------------------------------------------------------
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1",
        new Microsoft.OpenApi.Models.OpenApiInfo
        {
            Title = "Hospital Emergency & Accident Ward Patient Display API",
            Version = "v1",
            Description =
                "Backend API for the Government Hospital Emergency & Accident Ward " +
                "patient registration and public TV dashboard system."
        });
});

var app = builder.Build();

// -----------------------------------------------------------------------
// Ensure the dashboard image upload folder exists before requests start
// arriving, so the first upload doesn't pay directory-creation latency.
// -----------------------------------------------------------------------
var uploadsPath = Path.Combine(
    app.Environment.WebRootPath
        ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"),
    "uploads",
    "dashboard-images");

Directory.CreateDirectory(uploadsPath);

// -----------------------------------------------------------------------
// Middleware pipeline
// -----------------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "Hospital Display API v1");
    });
}

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseCors(CorsPolicyName);

app.UseAuthorization();

app.MapControllers();

app.Run();