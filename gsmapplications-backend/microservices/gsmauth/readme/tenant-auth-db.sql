CREATE DATABASE Auth_GSM001_Db;
GO
USE Auth_GSM001_Db;
GO
CREATE TABLE Users (
    IdUser INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    FirstName NVARCHAR(100) NULL,
    LastName NVARCHAR(100) NULL,
    FullName NVARCHAR(200) NULL,
    Email NVARCHAR(200) NULL,
    Department NVARCHAR(100) NULL,
    Profile NVARCHAR(100) NULL,
    PasswordChangeRequired BIT NOT NULL DEFAULT(0),
    Location NVARCHAR(100) NULL,
    IsActive BIT NOT NULL DEFAULT(1),
    PasswordHash NVARCHAR(500) NOT NULL,
    PasswordSalt NVARCHAR(500) NOT NULL
);
GO
-- Debe insertar PasswordHash y PasswordSalt generados con PBKDF2.
