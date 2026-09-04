# Hospital Emergency & Accident Ward Patient Display System

Full-stack system for a Government Hospital Emergency & Accident Ward:
a staff-facing patient registration/management screen and a privacy-safe
public TV dashboard with rotating bilingual (English/Tamil) road-safety
awareness screens.

## Structure

```
HospitalDisplaySystem/
├── HospitalDisplay.Api/     ASP.NET Core 8 Web API (Repository + Service + DTO pattern, stored procedures only)
├── hospital-display-ui/     React 19 frontend (Vite, Bootstrap 5, Context API)
└── database/HospitalDisplayDB.sql   SQL Server schema, indexes, sample data, and stored procedures
```

## Backend setup

1. **New install:** run `database/HospitalDisplayDB.sql` against SQL Server (creates `HospitalDisplayDB`, table, indexes, sample data, and all stored procedures).
   **Existing install (already have data):** instead run `database/Patch_Apply_Latest_Fixes.sql` - it does **not** drop or reseed data. It adds the new `PatientNameTamil` column and recreates every stored procedure with the latest fixes, including the corrected `sp_UpdatePatient` (see "Known issues fixed" below). **This step is required** - the API code alone won't fix anything if the database still has the old procedures/schema.
2. Update `HospitalDisplay.Api/appsettings.json` -> `ConnectionStrings:DefaultConnection` for your SQL Server instance.
3. From `HospitalDisplay.Api/`:
   ```
   dotnet restore
   dotnet run
   ```
4. Swagger UI is available at `/swagger` in the Development environment.

### Known issues fixed

- **Edit showed "Patient not found"**: `sp_UpdatePatient` filtered on `IsActive = 1`, which didn't match the existence check the API runs first (`sp_GetPatientById`, unrestricted). A valid update could affect 0 rows and be reported as "not found". Fixed by matching on `PatientId` only.
- **Errors were generic**: Create/Update/Delete now include the underlying exception message in the API error response, so if something is still misconfigured (e.g. the DB patch hasn't been applied yet, wrong connection string, etc.) the toast in the UI will show the real SQL/.NET error instead of a generic message - please share that exact text if you still see a failure.
- **Patient names not switching to Tamil**: names are free text (proper nouns), not dictionary words, so they can't be machine-translated. Added an optional "Patient Name (Tamil)" field on the registration form; when filled in, the TV dashboard shows it when a visitor switches to Tamil (falls back to the English name otherwise).

## Frontend setup

1. From `hospital-display-ui/`:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your API's base URL (e.g. `https://localhost:7001/api`).
3. Run:
   ```
   npm run dev
   ```
4. `/` -> public TV dashboard (full screen, no counts/statistics - just each patient's card - rotates 10 cards at a time every 10s / safety screen every 3s, auto-refreshes data every 10s).
   `/register` -> staff patient registration, edit, search, paginated management grid.

## Privacy note

The `/api/patient/dashboard` endpoint and its `DashboardPatientDto` intentionally
expose only Patient Name (+ optional Tamil name), Age, Gender, Admit Time and
Criticality. Internal IDs, Father Name, and all other fields are never returned
by this endpoint, in line with the requirement that the public TV display show
no confidential or statistical hospital information. Deceased patients are
also excluded from this endpoint entirely - only Stable/Critical patients are
shown to visitors.
