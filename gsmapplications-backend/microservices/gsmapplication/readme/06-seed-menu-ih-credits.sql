-- Credits module (IH tenant only — run on INTIH, never on AG).
-- Adds ONE child under the existing 'credits' parent: "Dashboard" → /dashboard/credits/dashboard
-- (the page itself has the Credits / Pre-alerts / Suppliers tabs; the detail pages
--  /dashboard/credits/credit?id= and /dashboard/credits/prealert?id= need no menu rows).
-- The existing CRRA / CRC / CRT children are left untouched.
SET NOCOUNT ON;

DECLARE @parent INT = (SELECT TOP 1 IdMenuOption FROM db_ms.MenuOptions WHERE IdObject = 'credits');
IF @parent IS NULL
BEGIN
    INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent)
    VALUES ('credits', 'Credits', 'menu', 'credit-card', NULL, 0, NULL);
    SET @parent = SCOPE_IDENTITY();
END

IF NOT EXISTS (SELECT 1 FROM db_ms.MenuOptions WHERE IdObject = 'credits-dashboard')
BEGIN
    INSERT INTO db_ms.MenuOptions (IdObject, Description, Section, Icon, Route, IsNew, IdParent)
    VALUES ('credits-dashboard', 'Dashboard', 'menu', 'layout-dashboard', '/dashboard/credits/dashboard', 1, @parent);
END

DECLARE @option INT = (SELECT IdMenuOption FROM db_ms.MenuOptions WHERE IdObject = 'credits-dashboard');

-- Access: profile 1 (admin) plus any profile that already sees the 'credits' parent.
INSERT INTO db_ms.ProfileAccess (IdProfile, IdMenuOption, HasAccess)
SELECT p.IdProfile, @option, 1
FROM (
    SELECT 1 AS IdProfile
    UNION
    SELECT IdProfile FROM db_ms.ProfileAccess WHERE IdMenuOption = @parent AND HasAccess = 1
) p
WHERE NOT EXISTS (SELECT 1 FROM db_ms.ProfileAccess a WHERE a.IdProfile = p.IdProfile AND a.IdMenuOption = @option);

SELECT IdMenuOption, IdObject, Description, Route, IdParent FROM db_ms.MenuOptions WHERE IdObject IN ('credits', 'credits-dashboard');
