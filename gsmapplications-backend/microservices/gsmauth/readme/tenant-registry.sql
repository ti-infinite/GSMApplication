CREATE DATABASE TenantRegistryDb;
GO
USE TenantRegistryDb;
GO
CREATE TABLE Tenants (
    CompanyId NVARCHAR(50) NOT NULL PRIMARY KEY,
    Server NVARCHAR(255) NOT NULL,
    Database NVARCHAR(255) NOT NULL,
    DbUser NVARCHAR(255) NOT NULL,
    DbPassword NVARCHAR(255) NOT NULL,
    IsActive BIT NOT NULL DEFAULT(1)
);
GO

INSERT INTO Tenants (CompanyId, Server, Database, DbUser, DbPassword, IsActive)
VALUES ('GSM001', '(localdb)\mssqllocaldb', 'Auth_GSM001_Db', 'sa-demo', 'demo-password', 1);
GO
