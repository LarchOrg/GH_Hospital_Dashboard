/* =====================================================================
   Hospital Emergency & Accident Ward Patient Display System
   Database creation script for SQL Server
   ===================================================================== */

IF DB_ID('HospitalDisplayDB') IS NULL
BEGIN
    CREATE DATABASE HospitalDisplayDB;
END
GO

USE HospitalDisplayDB;
GO

/* ---------------------------------------------------------------------
   Table: PatientMaster
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.PatientMaster', 'U') IS NOT NULL
    DROP TABLE dbo.PatientMaster;
GO

CREATE TABLE dbo.PatientMaster
(
    PatientId              INT IDENTITY(1,1)      NOT NULL,
    PatientName            NVARCHAR(150)          NOT NULL,
    PatientNameTamil       NVARCHAR(150)          NOT NULL,
    Age                    INT                    NOT NULL,
    Gender                 NVARCHAR(20)           NOT NULL,
    FatherName             NVARCHAR(150)          NOT NULL,
    FatherNameTamil        NVARCHAR(150)          NOT NULL,
    AdmitTime              DATETIME2              NOT NULL,
    Criticality            NVARCHAR(20)           NOT NULL CONSTRAINT DF_PatientMaster_Criticality DEFAULT ('Stable'),
    WardStatus              NVARCHAR(20)          NULL,

    -- Set automatically (see trg_PatientMaster_StatusChanged below)
    -- whenever WardStatus actually changes value - NOT on every edit.
    -- Drives the "only show on the TV dashboard for 10 minutes after
    -- Ward Change / Discharged is set" rule; a plain ModifiedDate would
    -- be wrong here because it refreshes on ANY field edit, not just a
    -- ward-status change.
    WardStatusChangedDate  DATETIME2              NULL,

    -- Set automatically the moment Criticality transitions TO 'Deceased'
    -- (never on any other edit). Drives the same "only show on the TV
    -- dashboard for 10 minutes" rule, applied to Deceased patients -
    -- after that window the row stops appearing on the dashboard, but is
    -- never deleted and remains fully visible in the staff grid.
    DeceasedAt             DATETIME2              NULL,

    CreatedDate            DATETIME2              NOT NULL CONSTRAINT DF_PatientMaster_CreatedDate DEFAULT (SYSUTCDATETIME()),
    ModifiedDate            DATETIME2             NULL,
    IsActive                BIT                   NOT NULL CONSTRAINT DF_PatientMaster_IsActive DEFAULT (1),

    CONSTRAINT PK_PatientMaster PRIMARY KEY CLUSTERED (PatientId ASC),
    CONSTRAINT CK_PatientMaster_Age CHECK (Age >= 0 AND Age <= 150),
    CONSTRAINT CK_PatientMaster_Criticality CHECK (Criticality IN ('Stable', 'Critical', 'MostCritical', 'Deceased')),
    CONSTRAINT CK_PatientMaster_WardStatus CHECK (WardStatus IS NULL OR WardStatus IN ('Ward', 'Discharged'))
);
GO

CREATE NONCLUSTERED INDEX IX_PatientMaster_IsActive ON dbo.PatientMaster (IsActive);
GO

CREATE NONCLUSTERED INDEX IX_PatientMaster_Criticality ON dbo.PatientMaster (Criticality) INCLUDE (PatientName, Age, Gender, AdmitTime);
GO

CREATE NONCLUSTERED INDEX IX_PatientMaster_AdmitTime ON dbo.PatientMaster (AdmitTime DESC);
GO

CREATE NONCLUSTERED INDEX IX_PatientMaster_CreatedDate ON dbo.PatientMaster (CreatedDate DESC);
GO

CREATE NONCLUSTERED INDEX IX_PatientMaster_WardStatusChangedDate ON dbo.PatientMaster (WardStatusChangedDate);
GO

CREATE NONCLUSTERED INDEX IX_PatientMaster_DeceasedAt ON dbo.PatientMaster (DeceasedAt);
GO

/* ---------------------------------------------------------------------
   Trigger: trg_PatientMaster_StatusChanged
   Stamps two "when did this status last change" columns automatically,
   no matter which stored procedure performed the UPDATE - so every
   caller gets correct 10-minute dashboard visibility windows without
   needing to remember to set anything itself:

     - WardStatusChangedDate: current UTC time, whenever the WardStatus
       column's VALUE actually changes (not on every save).
     - DeceasedAt: current UTC time, only the moment Criticality
       transitions TO 'Deceased' from something else (not on every save,
       and not on any other criticality change).

   The UPDATEs this trigger performs only ever touch
   WardStatusChangedDate/DeceasedAt, never WardStatus/Criticality
   themselves, so even if recursive triggers are enabled on the server,
   the nested invocation's UPDATE(WardStatus)/UPDATE(Criticality) checks
   are false and it exits immediately - no infinite loop.
   --------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------
   Table: DashboardImageMaster
   Stores only the generated file NAME of each uploaded dashboard image
   (never the binary). The actual file lives on disk under a fixed,
   relative uploads folder (wwwroot/uploads/dashboard-images/) served by
   the API's static file middleware - the DB never stores an absolute
   server path, only the file name needed to rebuild a relative URL.
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.DashboardImageMaster', 'U') IS NOT NULL
    DROP TABLE dbo.DashboardImageMaster;
GO

CREATE TABLE dbo.DashboardImageMaster
(
    ImageId        INT IDENTITY(1,1)  NOT NULL,
    ImageName      NVARCHAR(255)      NOT NULL,   -- generated file name on disk, e.g. 3f2a9c1e-....jpg
    OriginalName   NVARCHAR(255)      NULL,       -- original file name the user selected, for reference only
    DisplayOrder   INT                NOT NULL CONSTRAINT DF_DashboardImageMaster_DisplayOrder DEFAULT (0),
    UploadedDate   DATETIME2          NOT NULL CONSTRAINT DF_DashboardImageMaster_UploadedDate DEFAULT (SYSUTCDATETIME()),
    IsActive       BIT                NOT NULL CONSTRAINT DF_DashboardImageMaster_IsActive DEFAULT (1),

    CONSTRAINT PK_DashboardImageMaster PRIMARY KEY CLUSTERED (ImageId ASC)
);
GO

CREATE NONCLUSTERED INDEX IX_DashboardImageMaster_IsActive ON dbo.DashboardImageMaster (IsActive, DisplayOrder, ImageId);
GO

/* ---------------------------------------------------------------------
   Sample Data
   --------------------------------------------------------------------- */
INSERT INTO dbo.PatientMaster (PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime, Criticality, WardStatus)
VALUES
    (N'Ravi Kumar',     N'ரவி குமார்',       34, N'Male',   N'Muthu Kumar',     N'முத்து குமார்',     DATEADD(HOUR, -3, SYSUTCDATETIME()), N'Stable',   NULL),
    (N'Lakshmi Priya',  N'லக்ஷ்மி பிரியா',   28, N'Female', N'Selvam',          N'செல்வம்',           DATEADD(HOUR, -2, SYSUTCDATETIME()), N'Critical', NULL),
    (N'Suresh Babu',    N'சுரேஷ் பாபு',      56, N'Male',   N'Gopal Krishnan',  N'கோபால் கிருஷ்ணன்', DATEADD(HOUR, -5, SYSUTCDATETIME()), N'Stable',   NULL),
    (N'Meena Kumari',   N'மீனா குமாரி',      41, N'Female', N'Rajendran',       N'ராஜேந்திரன்',       DATEADD(HOUR, -1, SYSUTCDATETIME()), N'Stable',   NULL),
    (N'Arun Prakash',   N'அருண் பிரகாஷ்',   19, N'Male',   N'Prakash Raj',     N'பிரகாஷ் ராஜ்',     DATEADD(MINUTE, -45, SYSUTCDATETIME()), N'MostCritical', NULL),
    (N'Kavitha Devi',   N'கவிதா தேவி',      63, N'Female', N'Manickam',        N'மாணிக்கம்',         DATEADD(HOUR, -6, SYSUTCDATETIME()), N'Deceased', NULL),
    (N'Dinesh Raj',     N'தினேஷ் ராஜ்',     25, N'Male',   N'Rajkumar',        N'ராஜ்குமார்',        DATEADD(MINUTE, -20, SYSUTCDATETIME()), N'Stable',   NULL),
    (N'Anitha Rani',    N'அனிதா ராணி',      47, N'Female', N'Kannan',          N'கண்ணன்',            DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Stable',   NULL);
GO

/* =====================================================================
   Stored Procedures
   ===================================================================== */

-- ---------------------------------------------------------------------
-- sp_InsertPatient
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_UpdatePatient
-- Matches the tested/working version supplied by the hospital's DBA,
-- with FatherNameTamil added as a straightforward additive column (same
-- "no IsActive filter" behaviour and the SELECT CAST(@@ROWCOUNT ...)
-- fix preserved exactly as tested).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_DeletePatient  (soft delete)
-- Matches the tested/working version supplied by the hospital's DBA.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_GetAllPatients
-- Staff management grid - newest registration first (insertion order,
-- descending), regardless of the AdmitTime the staff member typed in.
-- Always returns every active patient regardless of WardStatus/age of
-- that status - the 10-minute cutoff only applies to the public
-- dashboard (sp_GetDashboardPatients), never to this staff-facing grid.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_GetPatientById
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_GetDashboardPatients
-- Returns currently-active patients, most critical and most recent
-- first, for the public TV dashboard. The API layer trims this to a
-- privacy-safe DTO before it reaches the client.
--
-- Visibility rule: a patient whose WardStatus is NULL (not set) always
-- shows, same as before. A patient whose WardStatus is 'Ward' (ward
-- change) or 'Discharged' only shows for 10 minutes after that status
-- was set (WardStatusChangedDate). Likewise, a patient whose Criticality
-- is 'Deceased' only shows for 10 minutes after becoming Deceased
-- (DeceasedAt) - if DeceasedAt is unknown/unset (e.g. a legacy record
-- from before this column existed) they are NOT shown, matching the
-- original always-hidden behaviour. Both timestamps are maintained
-- automatically by trg_PatientMaster_StatusChanged. Either way, once the
-- window closes the row silently drops off the dashboard - it is never
-- deleted, and stays fully visible and editable in the staff grid
-- (sp_GetAllPatients) forever.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_SearchPatient
-- Keyword search (name/father name) combined with an optional admit-date
-- range filter (@FromDate / @ToDate, inclusive of the whole @ToDate day).
-- Any parameter left NULL is simply not applied.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- sp_UpdateCriticality
-- ---------------------------------------------------------------------
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

/* =====================================================================
   Dashboard Image Stored Procedures
   ===================================================================== */

-- ---------------------------------------------------------------------
-- sp_InsertDashboardImage
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_InsertDashboardImage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_InsertDashboardImage;
GO
CREATE PROCEDURE dbo.sp_InsertDashboardImage
    @ImageName     NVARCHAR(255),
    @OriginalName  NVARCHAR(255) = NULL,
    @DisplayOrder  INT = 0,
    @NewImageId    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.DashboardImageMaster (ImageName, OriginalName, DisplayOrder, UploadedDate, IsActive)
    VALUES (@ImageName, @OriginalName, @DisplayOrder, SYSUTCDATETIME(), 1);

    SET @NewImageId = SCOPE_IDENTITY();
END
GO

-- ---------------------------------------------------------------------
-- sp_GetAllDashboardImages
-- Returns active images in upload order, oldest first, which is also
-- the order they are cycled through on the public TV dashboard.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_GetAllDashboardImages', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetAllDashboardImages;
GO
CREATE PROCEDURE dbo.sp_GetAllDashboardImages
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ImageId, ImageName, OriginalName, DisplayOrder, UploadedDate, IsActive
    FROM dbo.DashboardImageMaster
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, ImageId ASC;
END
GO

-- ---------------------------------------------------------------------
-- sp_GetDashboardImageById
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_GetDashboardImageById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDashboardImageById;
GO
CREATE PROCEDURE dbo.sp_GetDashboardImageById
    @ImageId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ImageId, ImageName, OriginalName, DisplayOrder, UploadedDate, IsActive
    FROM dbo.DashboardImageMaster
    WHERE ImageId = @ImageId;
END
GO

-- ---------------------------------------------------------------------
-- sp_DeleteDashboardImage  (soft delete - the API also removes the
-- physical file from disk when this succeeds)
-- Matches the tested/working version supplied by the hospital's DBA.
-- ---------------------------------------------------------------------
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
