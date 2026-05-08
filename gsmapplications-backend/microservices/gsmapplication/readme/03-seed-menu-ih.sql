-- ============================================================
-- Seed — Infinite Herbs menu (INTIH)
-- Run AFTER 01-alter-menu-options-ih.sql
-- ============================================================
USE [INTIH]
GO

-- ── Variables para capturar IDs de padres ─────────────────────
DECLARE @IdCredits  INT,
        @IdRRHH     INT

-- ── Padres ────────────────────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('home',              'Home',              'menu',   'house',            '/dashboard',  0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('dashboards',        'Dashboards',        'menu',   'layout-dashboard', NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('credits',           'Credits',           'menu',   'credit-card',      NULL,          0, NULL)
SET @IdCredits = SCOPE_IDENTITY()

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('inventory-manager', 'Inventory Manager', 'menu',   'package',          NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('labor',             'Labor',             'menu',   'hammer',           NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('rrhh',              'RRHH',              'menu',   'users',            NULL,          0, NULL)
SET @IdRRHH = SCOPE_IDENTITY()

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('resources',         'Resources',         'menu',   'boxes',            NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('sop',               'SOP',               'menu',   'book-open',        NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('yield',             'Yield',             'menu',   'bar-chart-2',      NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('logs',              'Logs',              'menu',   'clipboard-list',   NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('settings',          'Setting',           'others', 'settings',         '/dashboard/settings', 0, NULL)

-- ── Hijos de Credits ──────────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('credits-crra', 'CRRA', 'menu', 'file-text',  '/dashboard/credits/crra', 1, @IdCredits),
('credits-crc',  'CRC',  'menu', 'file-check', '/dashboard/credits/crc',  1, @IdCredits),
('credits-crt',  'CRT',  'menu', 'file-plus',  '/dashboard/credits/crt',  1, @IdCredits)

-- ── Hijos de RRHH ─────────────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('rrhh-employees', 'Employees', 'menu', 'user', '/dashboard/rrhh/employees', 1, @IdRRHH)
GO

-- ── Dar acceso completo al perfil 1 ───────────────────────────
INSERT INTO db_ms.ProfileAccess (IdProfile, IdMenuOption, HasAccess)
SELECT 1, IdMenuOption, 1 FROM db_ms.MenuOptions
GO