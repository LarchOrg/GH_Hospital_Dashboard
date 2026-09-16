/* =====================================================================
   Patch: apply the latest fixes to an EXISTING HospitalDisplayDB
   -----------------------------------------------------------------------
   This patch assumes all earlier patches (WardStatus, MostCritical,
   DashboardImageMaster, etc.) have already been applied - it is safe to
   run again even if some of these already exist, thanks to the
   IF NOT EXISTS / IF OBJECT_ID checks throughout. It does NOT drop or
   reseed PatientMaster, so existing patient records are preserved. It:

     1. Makes PatientNameTamil, FatherName and FatherNameTamil required
        (NOT NULL) columns, matching the form now requiring them. Any
        existing NULL values are backfilled to an empty string first, so
        this never fails on data saved before this patch.

     2. Adds the WardStatusChangedDate and DeceasedAt columns (nullable
        DATETIME2) and a trigger that stamps them with the current UTC
        time only when WardStatus actually CHANGES value, or Criticality
        transitions TO 'Deceased' (not on every save). This drives the
        "Ward Change / Discharged / Deceased patients only stay on the
        public dashboard for 10 minutes after that status is set" rule -
        a plain ModifiedDate would be wrong here since it refreshes on
        any edit, not just a status change.

     3. Updates sp_GetDashboardPatients to apply that 10-minute cutoff to
        both Ward Change/Discharged AND Deceased patients. Patients with
        no WardStatus set are completely unaffected - they keep showing
        on the dashboard exactly as before, with no time restriction. A
        Deceased patient with no known DeceasedAt (i.e. already Deceased
        before this patch) stays hidden, matching the original
        always-hidden behaviour, until/unless their criticality changes
        again. The staff grid (sp_GetAllPatients) is NOT filtered by any
        of this and continues to show every active patient regardless of
        status or how long ago it changed - records are never deleted,
        only the dashboard *fetch* is time-limited.

     4. Updates sp_SearchPatient to accept optional @FromDate / @ToDate
        parameters for the new admit-date range filter on the staff grid.

     5. Recreates sp_InsertPatient, sp_UpdatePatient, sp_DeletePatient,
        sp_GetAllPatients, sp_GetPatientById and sp_DeleteDashboardImage.
        sp_UpdatePatient, sp_DeletePatient and sp_DeleteDashboardImage
        match the exact, already-tested definitions supplied by the
        hospital's DBA (the SELECT CAST(@@ROWCOUNT AS INT) AS
        RowsAffected fix); sp_UpdatePatient only has FatherNameTamil
        added on top, with no other change to that tested logic.

   Run this whole script once against your existing database.
   ===================================================================== */

USE HospitalDisplayDB;
GO

/* ---------------------------------------------------------------------
   Step 1: PatientNameTamil / FatherName / FatherNameTamil -> required
   -----------------------------------------------------------------------
   IMPORTANT: each ADD COLUMN runs in its own batch (terminated by GO)
   BEFORE any later statement references that column by name. SQL Server
   compiles an entire batch - including branches that won't run - before
   executing any of it, so a column added earlier IN THE SAME BATCH is
   not yet valid for other statements to reference; doing so throws
   "Invalid column name" and aborts the whole batch, silently skipping
   the ADD COLUMN too. Splitting into separate GO batches avoids this.
   --------------------------------------------------------------------- */

-- 1a. Add each column as NULL first if it doesn't already exist (safe:
-- this statement never references the column elsewhere in this batch).
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PatientMaster') AND name = 'PatientNameTamil')
BEGIN
    ALTER TABLE dbo.PatientMaster ADD PatientNameTamil NVARCHAR(150) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PatientMaster') AND name = 'FatherName')
BEGIN
    ALTER TABLE dbo.PatientMaster ADD FatherName NVARCHAR(150) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PatientMaster') AND name = 'FatherNameTamil')
BEGIN
    ALTER TABLE dbo.PatientMaster ADD FatherNameTamil NVARCHAR(150) NULL;
END
GO

-- 1b. Now that every column is guaranteed to exist (either it already did,
-- or the batch above just added it), backfill any NULLs and tighten each
-- to NOT NULL. Each in its own batch, purely for clarity/consistency.
UPDATE dbo.PatientMaster SET PatientNameTamil = N'' WHERE PatientNameTamil IS NULL;
GO
ALTER TABLE dbo.PatientMaster ALTER COLUMN PatientNameTamil NVARCHAR(150) NOT NULL;
GO

UPDATE dbo.PatientMaster SET FatherName = N'' WHERE FatherName IS NULL;
GO
ALTER TABLE dbo.PatientMaster ALTER COLUMN FatherName NVARCHAR(150) NOT NULL;
GO

UPDATE dbo.PatientMaster SET FatherNameTamil = N'' WHERE FatherNameTamil IS NULL;
GO
ALTER TABLE dbo.PatientMaster ALTER COLUMN FatherNameTamil NVARCHAR(150) NOT NULL;
GO

/* ---------------------------------------------------------------------
   Step 2: WardStatusChangedDate / DeceasedAt columns + trigger
   --------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PatientMaster') AND name = 'WardStatusChangedDate')
BEGIN
    ALTER TABLE dbo.PatientMaster ADD WardStatusChangedDate DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PatientMaster') AND name = 'DeceasedAt')
BEGIN
    ALTER TABLE dbo.PatientMaster ADD DeceasedAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMaster_WardStatusChangedDate' AND object_id = OBJECT_ID('dbo.PatientMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMaster_WardStatusChangedDate ON dbo.PatientMaster (WardStatusChangedDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMaster_DeceasedAt' AND object_id = OBJECT_ID('dbo.PatientMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMaster_DeceasedAt ON dbo.PatientMaster (DeceasedAt);
END
GO

-- One-time backfill so patients that already have a WardStatus set
-- before this patch don't disappear from the dashboard immediately -
-- treat "unknown change time" as "just changed now".
UPDATE dbo.PatientMaster
SET WardStatusChangedDate = SYSUTCDATETIME()
WHERE WardStatus IS NOT NULL
  AND WardStatusChangedDate IS NULL;
GO

-- Deliberately NOT backfilled the same way: existing Deceased patients
-- keep DeceasedAt = NULL, which sp_GetDashboardPatients treats as "stay
-- hidden" - matching the ORIGINAL always-hidden behaviour for anyone who
-- was already marked Deceased before this patch. Only a fresh
-- transition into Deceased (via the trigger below) grants the new
-- 10-minute visibility window.

IF OBJECT_ID('dbo.trg_PatientMaster_WardStatusChanged', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_PatientMaster_WardStatusChanged;
GO
IF OBJECT_ID('dbo.trg_PatientMaster_StatusChanged', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_PatientMaster_StatusChanged;
GO
CREATE TRIGGER dbo.trg_PatientMaster_StatusChanged
ON dbo.PatientMaster
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(WardStatus)
    BEGIN
        UPDATE pm
        SET WardStatusChangedDate = SYSUTCDATETIME()
        FROM dbo.PatientMaster pm
        INNER JOIN inserted i ON pm.PatientId = i.PatientId
        INNER JOIN deleted d ON pm.PatientId = d.PatientId
        WHERE ISNULL(i.WardStatus, N'') <> ISNULL(d.WardStatus, N'');
    END

    IF UPDATE(Criticality)
    BEGIN
        UPDATE pm
        SET DeceasedAt = SYSUTCDATETIME()
        FROM dbo.PatientMaster pm
        INNER JOIN inserted i ON pm.PatientId = i.PatientId
        INNER JOIN deleted d ON pm.PatientId = d.PatientId
        WHERE i.Criticality = N'Deceased' AND d.Criticality <> N'Deceased';
    END
END
GO

/* =====================================================================
   Stored Procedures
   ===================================================================== */

IF OBJECT_ID('dbo.sp_InsertPatient', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_InsertPatient;
GO
CREATE PROCEDURE dbo.sp_InsertPatient
    @PatientName        NVARCHAR(150),
    @PatientNameTamil   NVARCHAR(150),
    @Age                INT,
    @Gender             NVARCHAR(20),
    @FatherName         NVARCHAR(150),
    @FatherNameTamil    NVARCHAR(150),
    @AdmitTime          DATETIME2,
    @Criticality        NVARCHAR(20),
    @WardStatus         NVARCHAR(20) = NULL,
    @NewPatientId       INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.PatientMaster
        (PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime, Criticality, WardStatus, WardStatusChangedDate, DeceasedAt, CreatedDate, IsActive)
    VALUES
        (@PatientName, @PatientNameTamil, @Age, @Gender, @FatherName, @FatherNameTamil, @AdmitTime, @Criticality, @WardStatus,
         CASE WHEN @WardStatus IS NOT NULL THEN SYSUTCDATETIME() ELSE NULL END,
         CASE WHEN @Criticality = N'Deceased' THEN SYSUTCDATETIME() ELSE NULL END,
         SYSUTCDATETIME(), 1);

    SET @NewPatientId = SCOPE_IDENTITY();
END
GO

-- sp_UpdatePatient - the hospital DBA's tested version, with FatherNameTamil added.
IF OBJECT_ID('dbo.sp_UpdatePatient', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_UpdatePatient;
GO
CREATE PROCEDURE dbo.sp_UpdatePatient
    @PatientId          INT,
    @PatientName        NVARCHAR(150),
    @PatientNameTamil   NVARCHAR(150),
    @Age                INT,
    @Gender             NVARCHAR(20),
    @FatherName         NVARCHAR(150),
    @FatherNameTamil    NVARCHAR(150),
    @AdmitTime          DATETIME2,
    @Criticality        NVARCHAR(20),
    @WardStatus         NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.PatientMaster
    SET
        PatientName      = @PatientName,
        PatientNameTamil = @PatientNameTamil,
        Age              = @Age,
        Gender           = @Gender,
        FatherName       = @FatherName,
        FatherNameTamil  = @FatherNameTamil,
        AdmitTime        = @AdmitTime,
        Criticality      = @Criticality,
        WardStatus       = @WardStatus,
        ModifiedDate     = SYSUTCDATETIME()
    WHERE PatientId = @PatientId;

    SELECT CAST(@@ROWCOUNT AS INT) AS RowsAffected;
END
GO

-- sp_DeletePatient - the hospital DBA's tested version, unchanged.
IF OBJECT_ID('dbo.sp_DeletePatient', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_DeletePatient;
GO
CREATE PROCEDURE dbo.sp_DeletePatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.PatientMaster
    SET
        IsActive = 0,
        ModifiedDate = SYSUTCDATETIME()
    WHERE PatientId = @PatientId
      AND IsActive = 1;

    SELECT CAST(@@ROWCOUNT AS INT) AS RowsAffected;
END
GO

IF OBJECT_ID('dbo.sp_GetAllPatients', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetAllPatients;
GO
CREATE PROCEDURE dbo.sp_GetAllPatients
AS
BEGIN
    SET NOCOUNT ON;

    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,
           Criticality, WardStatus, WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive
    FROM dbo.PatientMaster
    WHERE IsActive = 1
    ORDER BY CreatedDate DESC, PatientId DESC;
END
GO

IF OBJECT_ID('dbo.sp_GetPatientById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetPatientById;
GO
CREATE PROCEDURE dbo.sp_GetPatientById
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,
           Criticality, WardStatus, WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive
    FROM dbo.PatientMaster
    WHERE PatientId = @PatientId;
END
GO

-- sp_GetDashboardPatients - now applies the 10-minute cutoff to both
-- Ward Change/Discharged (WardStatusChangedDate) AND Deceased
-- (DeceasedAt); patients with no WardStatus set are unaffected as
-- before, and a Deceased patient with no known DeceasedAt (legacy data)
-- stays hidden, matching the original always-hidden behaviour.
IF OBJECT_ID('dbo.sp_GetDashboardPatients', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDashboardPatients;
GO
CREATE PROCEDURE dbo.sp_GetDashboardPatients
AS
BEGIN
    SET NOCOUNT ON;

    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,
           Criticality, WardStatus, WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive
    FROM dbo.PatientMaster
    WHERE IsActive = 1
      AND (
            Criticality <> 'Deceased'
            OR (DeceasedAt IS NOT NULL AND DeceasedAt >= DATEADD(MINUTE, -10, SYSUTCDATETIME()))
          )
      AND (
            WardStatus IS NULL
            OR WardStatusChangedDate IS NULL
            OR WardStatusChangedDate >= DATEADD(MINUTE, -10, SYSUTCDATETIME())
          )
    ORDER BY
        CASE Criticality
            WHEN 'MostCritical' THEN 0
            WHEN 'Critical' THEN 1
            WHEN 'Stable' THEN 2
            ELSE 3
        END,
        CreatedDate DESC,
        PatientId DESC;
END
GO

-- sp_SearchPatient - now also accepts an optional admit-date range.
IF OBJECT_ID('dbo.sp_SearchPatient', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_SearchPatient;
GO
CREATE PROCEDURE dbo.sp_SearchPatient
    @Keyword  NVARCHAR(150) = NULL,
    @FromDate DATETIME2     = NULL,
    @ToDate   DATETIME2     = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,
           Criticality, WardStatus, WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive
    FROM dbo.PatientMaster
    WHERE IsActive = 1
      AND (
            @Keyword IS NULL
            OR @Keyword = ''
            OR PatientName LIKE '%' + @Keyword + '%'
            OR FatherName LIKE '%' + @Keyword + '%'
          )
      AND (@FromDate IS NULL OR AdmitTime >= @FromDate)
      AND (@ToDate IS NULL OR AdmitTime < DATEADD(DAY, 1, @ToDate))
    ORDER BY CreatedDate DESC, PatientId DESC;
END
GO

IF OBJECT_ID('dbo.sp_UpdateCriticality', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_UpdateCriticality;
GO
CREATE PROCEDURE dbo.sp_UpdateCriticality
    @PatientId    INT,
    @Criticality  NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.PatientMaster
    SET Criticality = @Criticality,
        ModifiedDate = SYSUTCDATETIME()
    WHERE PatientId = @PatientId
      AND IsActive = 1;
END
GO

-- sp_DeleteDashboardImage - the hospital DBA's tested version, unchanged.
IF OBJECT_ID('dbo.sp_DeleteDashboardImage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_DeleteDashboardImage;
GO
CREATE PROCEDURE dbo.sp_DeleteDashboardImage
    @ImageId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DashboardImageMaster
    SET IsActive = 0
    WHERE ImageId = @ImageId
      AND IsActive = 1;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

PRINT 'Latest fixes applied successfully (required Tamil/father-name fields, 10-minute dashboard cutoff for Ward Change/Discharged/Deceased, date-range search, and the DBA-tested Update/Delete/DeleteImage procs).';
GO
