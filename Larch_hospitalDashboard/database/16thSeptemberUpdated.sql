
ALTER TABLE dbo.PatientMaster
ADD WardNumber NVARCHAR(5) NULL;

alter PROCEDURE dbo.sp_UpdatePatient    
    @PatientId          INT,    
    @PatientName        NVARCHAR(150),    
    @PatientNameTamil   NVARCHAR(150),    
    @Age                INT,    
    @Gender             NVARCHAR(20),    
    @FatherName         NVARCHAR(150),    
    @FatherNameTamil    NVARCHAR(150),    
    @AdmitTime          DATETIME2,    
    @Criticality        NVARCHAR(20),    
    @WardStatus         NVARCHAR(20) = NULL ,  
    @WardNumber         NVARCHAR(5)  = NULL  
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
        WardNumber       = @WardNumber,  
        ModifiedDate     = SYSUTCDATETIME()    
    WHERE PatientId = @PatientId;    
    
    SELECT CAST(@@ROWCOUNT AS INT) AS RowsAffected;    
END 


alter PROCEDURE dbo.sp_SearchPatient    
    @Keyword  NVARCHAR(150) = NULL,    
    @FromDate DATETIME2     = NULL,    
    @ToDate   DATETIME2     = NULL    
AS    
BEGIN    
    SET NOCOUNT ON;    
    
    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,    
           Criticality, WardStatus,WardNumber, WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive    
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

alter PROCEDURE dbo.sp_InsertPatient    
    @PatientName        NVARCHAR(150),    
    @PatientNameTamil   NVARCHAR(150),    
    @Age                INT,    
    @Gender             NVARCHAR(20),    
    @FatherName         NVARCHAR(150),    
    @FatherNameTamil    NVARCHAR(150),    
    @AdmitTime          DATETIME2,    
    @Criticality        NVARCHAR(20),    
    @WardStatus         NVARCHAR(20) = NULL,    
    @WardNumber         NVARCHAR(5)  = NULL,  
    @NewPatientId       INT OUTPUT    
AS    
BEGIN    
    SET NOCOUNT ON;    
    
    INSERT INTO dbo.PatientMaster    
        (PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime, Criticality, WardStatus, WardNumber, WardStatusChangedDate, DeceasedAt, CreatedDate, IsActive)    
    VALUES    
        (@PatientName, @PatientNameTamil, @Age, @Gender, @FatherName, @FatherNameTamil, @AdmitTime, @Criticality, @WardStatus, @WardNumber,    
         CASE WHEN @WardStatus IS NOT NULL THEN SYSUTCDATETIME() ELSE NULL END,    
         CASE WHEN @Criticality = N'Deceased' THEN SYSUTCDATETIME() ELSE NULL END,    
         SYSUTCDATETIME(), 1);    
    
    SET @NewPatientId = SCOPE_IDENTITY();    
END

alter PROCEDURE dbo.sp_GetPatientById        
    @PatientId INT        
AS        
BEGIN        
    SET NOCOUNT ON;        
        
    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,        
           Criticality, WardStatus, WardNumber,WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive        
    FROM dbo.PatientMaster        
    WHERE PatientId = @PatientId;        
END 

alter PROCEDURE dbo.sp_GetAllPatients    
AS    
BEGIN    
    SET NOCOUNT ON;    
    
    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,    
           Criticality, WardStatus,WardNumber, WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive    
    FROM dbo.PatientMaster    
    WHERE IsActive = 1    
    ORDER BY CreatedDate DESC, PatientId DESC;    
END 

alter PROCEDURE dbo.sp_GetDashboardPatients      
AS      
BEGIN      
    SET NOCOUNT ON;      
    
    -- 20 minutes for deceased and 8 hours for ward changed     
      
    SELECT PatientId, PatientName, PatientNameTamil, Age, Gender, FatherName, FatherNameTamil, AdmitTime,      
           Criticality, WardStatus, WardNumber,WardStatusChangedDate, DeceasedAt, CreatedDate, ModifiedDate, IsActive      
    FROM dbo.PatientMaster      
    WHERE IsActive = 1      
      AND (      
            Criticality <> 'Deceased'      
            OR (DeceasedAt IS NOT NULL AND DeceasedAt >= DATEADD(MINUTE, -20, SYSUTCDATETIME()))      
          )      
      AND (      
            WardStatus IS NULL      
            OR WardStatusChangedDate IS NULL      
            OR WardStatusChangedDate >= DATEADD(HOUR, -8, SYSUTCDATETIME())      
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