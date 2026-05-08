-- ============================================================
-- Seed — Agroaromas menu (AA)
-- Run AFTER 02-alter-menu-options-ag.sql
-- ============================================================
USE [AA]
GO

-- ── Variables para capturar IDs de padres ─────────────────────
DECLARE @IdCreditos      INT,
        @IdRRHH          INT,
        @IdTrazabilidad  INT

-- ── Padres ────────────────────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('inicio',            'Inicio',            'menu',   'house',            '/dashboard',  0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('dashboard',         'Dashboard',         'menu',   'layout-dashboard', NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('creditos',          'Creditos',          'menu',   'wallet',           NULL,          0, NULL)
SET @IdCreditos = SCOPE_IDENTITY()

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('inventory-manager', 'Inventory Manager', 'menu',   'package',          NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('rrhh',              'RRHH',              'menu',   'users',            NULL,          0, NULL)
SET @IdRRHH = SCOPE_IDENTITY()

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('herbs-need',        'Herbs Need',        'menu',   'leaf',             NULL,          0, NULL)

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('trazabilidad',      'Trazabilidad',      'menu',   'git-branch',       NULL,          0, NULL)
SET @IdTrazabilidad = SCOPE_IDENTITY()

INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('configuraciones',   'Configuraciones',   'others', 'settings',         '/dashboard/settings', 0, NULL)

-- ── Hijos de Creditos ─────────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('creditos-aa', 'Crédito AA', 'menu', 'credit-card', '/dashboard/creditos/aa', 0, @IdCreditos)

-- ── Hijos de RRHH ─────────────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('rrhh-empleados',   'Empleados',   'menu', 'user',   '/dashboard/rrhh/empleados',   0, @IdRRHH),
('rrhh-horas-extra', 'Horas Extra', 'menu', 'scroll', '/dashboard/rrhh/horas-extra', 0, @IdRRHH)

-- ── Hijos de Trazabilidad ─────────────────────────────────────
INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent) VALUES
('traz-hoja-ruta',        'Hoja de Ruta',       'menu', 'map',            '/dashboard/trazabilidad/hoja-ruta',      0, @IdTrazabilidad),
('traz-delivery-product', 'Entrega de Producto', 'menu', 'clipboard-list', '/dashboard/trazabilidad/entrega-producto', 0, @IdTrazabilidad)
GO

-- ── Dar acceso completo al perfil 1 ───────────────────────────
INSERT INTO db_ms.ProfileAccess (IdProfile, IdMenuOption, HasAccess)
SELECT 1, IdMenuOption, 1 FROM db_ms.MenuOptions
GO