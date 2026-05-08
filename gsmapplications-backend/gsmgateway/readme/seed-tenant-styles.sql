-- ============================================================
-- Tenant JsonStyles seed
-- Run against the MasterTenant (registry) database.
-- Replace 'IH001' and 'AG001' with the actual CompanyId values
-- already present in your Tenants table.
-- ============================================================

-- ── Infinite Herbs (navy / blue-purple) ─────────────────────
UPDATE dbo.Tenants
SET JsonStyles = N'{
  "light": {
    "--background":              "oklch(0.97 0.001 0)",
    "--foreground":              "oklch(0.2 0.001 0)",
    "--card":                    "oklch(0.9940 0 0)",
    "--card-foreground":         "oklch(0.235 0.001 0)",
    "--popover":                 "oklch(0.9911 0 0)",
    "--popover-foreground":      "oklch(0.572 0.04 229.025)",
    "--primary":                 "oklch(0.316 0.117 268.481)",
    "--primary-foreground":      "oklch(1.0000 0 0)",
    "--secondary":               "oklch(0.797 0.162 69.201)",
    "--secondary-foreground":    "oklch(0.264 0.001 0)",
    "--muted":                   "oklch(0.9702 0 0)",
    "--muted-foreground":        "oklch(0.475 0.001 0)",
    "--accent":                  "oklch(0.857 0.048 233.695)",
    "--accent-foreground":       "oklch(0.468 0.196 260.463)",
    "--destructive":             "oklch(0.552 0.221 28.99)",
    "--border":                  "oklch(0.9300 0.0094 286.2156)",
    "--input":                   "oklch(0.9401 0 0)",
    "--ring":                    "oklch(0 0 0)",
    "--chart-1":                 "oklch(0.766 0.118 145.295)",
    "--chart-2":                 "oklch(0.5393 0.2713 286.7462)",
    "--chart-3":                 "oklch(0.7336 0.1758 50.5517)",
    "--chart-4":                 "oklch(0.5828 0.1809 259.7276)",
    "--chart-5":                 "oklch(0.572 0.04 229.025)",
    "--sidebar":                 "oklch(0.9777 0.0051 247.8763)",
    "--sidebar-foreground":      "oklch(0 0 0)",
    "--sidebar-primary":         "oklch(0 0 0)",
    "--sidebar-primary-foreground": "oklch(1.0000 0 0)",
    "--sidebar-accent":          "oklch(0.9401 0 0)",
    "--sidebar-accent-foreground": "oklch(0 0 0)",
    "--sidebar-border":          "oklch(0.9401 0 0)",
    "--sidebar-ring":            "oklch(0 0 0)",
    "--radius":                  "0.375rem"
  },
  "dark": {
    "--background":              "oklch(0.2223 0.0060 271.1393)",
    "--foreground":              "oklch(0.9551 0 0)",
    "--card":                    "oklch(0.2568 0.0076 274.6528)",
    "--card-foreground":         "oklch(0.9551 0 0)",
    "--popover":                 "oklch(0.2568 0.0076 274.6528)",
    "--popover-foreground":      "oklch(0.9551 0 0)",
    "--primary":                 "oklch(0.6132 0.2294 291.7437)",
    "--primary-foreground":      "oklch(1.0000 0 0)",
    "--secondary":               "oklch(0.2940 0.0130 272.9312)",
    "--secondary-foreground":    "oklch(0.9551 0 0)",
    "--muted":                   "oklch(0.2940 0.0130 272.9312)",
    "--muted-foreground":        "oklch(0.7058 0 0)",
    "--accent":                  "oklch(0.2795 0.0368 260.0310)",
    "--accent-foreground":       "oklch(0.7857 0.1153 246.6596)",
    "--destructive":             "oklch(0.7106 0.1661 22.2162)",
    "--border":                  "oklch(0.3289 0.0092 268.3843)",
    "--input":                   "oklch(0.3289 0.0092 268.3843)",
    "--ring":                    "oklch(0.6132 0.2294 291.7437)",
    "--chart-1":                 "oklch(0.8003 0.1821 151.7110)",
    "--chart-2":                 "oklch(0.6132 0.2294 291.7437)",
    "--chart-3":                 "oklch(0.8077 0.1035 19.5706)",
    "--chart-4":                 "oklch(0.6691 0.1569 260.1063)",
    "--chart-5":                 "oklch(0.7058 0 0)",
    "--sidebar":                 "oklch(0.2011 0.0039 286.0396)",
    "--sidebar-foreground":      "oklch(0.9551 0 0)",
    "--sidebar-primary":         "oklch(0.6132 0.2294 291.7437)",
    "--sidebar-primary-foreground": "oklch(1.0000 0 0)",
    "--sidebar-accent":          "oklch(0.2940 0.0130 272.9312)",
    "--sidebar-accent-foreground": "oklch(0.6132 0.2294 291.7437)",
    "--sidebar-border":          "oklch(0.3289 0.0092 268.3843)",
    "--sidebar-ring":            "oklch(0.6132 0.2294 291.7437)",
    "--radius":                  "0.375rem"
  },
  "meta": {
    "name": "Infinite Herbs",
    "initials": "IH",
    "defaultLocale": "en",
    "logo": "/ih.svg",
    "tagline": {
      "en": "Agricultural Management Platform",
      "es": "Plataforma de Gestión Agrícola"
    }
  }
}'
WHERE CompanyId = 'IH001';  -- ← replace with your actual IH CompanyId


-- ── Agroaromas (dark green) ──────────────────────────────────
UPDATE dbo.Tenants
SET JsonStyles = N'{
  "light": {
    "--background":              "oklch(0.9812 0.0085 128.56)",
    "--foreground":              "oklch(0.3409 0.0365 140.38)",
    "--card":                    "oklch(1 0 0)",
    "--card-foreground":         "oklch(0.3409 0.0365 140.38)",
    "--popover":                 "oklch(1 0 0)",
    "--popover-foreground":      "oklch(0.3409 0.0365 140.38)",
    "--primary":                 "oklch(0.3895 0.0927 156.11)",
    "--primary-foreground":      "oklch(0.9812 0.0085 128.56)",
    "--secondary":               "oklch(0.6718 0.1782 140.42)",
    "--secondary-foreground":    "oklch(0.9812 0.0085 128.56)",
    "--muted":                   "oklch(0.9438 0.0164 133.82)",
    "--muted-foreground":        "oklch(0.4994 0.0354 136.30)",
    "--accent":                  "oklch(0.9621 0.0707 140.09)",
    "--accent-foreground":       "oklch(0.3409 0.0365 140.38)",
    "--destructive":             "oklch(0.6000 0.1771 36.82)",
    "--border":                  "oklch(0.8926 0.0274 134.98)",
    "--input":                   "oklch(0.8926 0.0274 134.98)",
    "--ring":                    "oklch(0.6718 0.1782 140.42)",
    "--chart-1":                 "oklch(0.3895 0.0927 156.11)",
    "--chart-2":                 "oklch(0.5126 0.1198 153.60)",
    "--chart-3":                 "oklch(0.6718 0.1782 140.42)",
    "--chart-4":                 "oklch(0.8027 0.1400 138.66)",
    "--chart-5":                 "oklch(0.9621 0.0707 140.09)",
    "--sidebar":                 "oklch(0.9608 0.0180 134.92)",
    "--sidebar-foreground":      "oklch(0.3409 0.0365 140.38)",
    "--sidebar-primary":         "oklch(0.3895 0.0927 156.11)",
    "--sidebar-primary-foreground": "oklch(0.9812 0.0085 128.56)",
    "--sidebar-accent":          "oklch(0.9621 0.0707 140.09)",
    "--sidebar-accent-foreground": "oklch(0.3409 0.0365 140.38)",
    "--sidebar-border":          "oklch(0.8926 0.0274 134.98)",
    "--sidebar-ring":            "oklch(0.6718 0.1782 140.42)",
    "--radius":                  "0.5rem"
  },
  "dark": {
    "--background":              "oklch(0.2432 0.0257 137.98)",
    "--foreground":              "oklch(0.9175 0.0249 137.81)",
    "--card":                    "oklch(0.2718 0.0339 139.79)",
    "--card-foreground":         "oklch(0.9175 0.0249 137.81)",
    "--popover":                 "oklch(0.2718 0.0339 139.79)",
    "--popover-foreground":      "oklch(0.9175 0.0249 137.81)",
    "--primary":                 "oklch(0.6038 0.1203 154.52)",
    "--primary-foreground":      "oklch(0.2027 0.0298 140.68)",
    "--secondary":               "oklch(0.6718 0.1782 140.42)",
    "--secondary-foreground":    "oklch(0.2027 0.0298 140.68)",
    "--muted":                   "oklch(0.2850 0.0314 139.44)",
    "--muted-foreground":        "oklch(0.7083 0.0558 139.97)",
    "--accent":                  "oklch(0.3250 0.0545 140.79)",
    "--accent-foreground":       "oklch(0.9175 0.0249 137.81)",
    "--destructive":             "oklch(0.6563 0.1700 40.06)",
    "--border":                  "oklch(0.3424 0.0420 139.71)",
    "--input":                   "oklch(0.3424 0.0420 139.71)",
    "--ring":                    "oklch(0.6718 0.1782 140.42)",
    "--chart-1":                 "oklch(0.6038 0.1203 154.52)",
    "--chart-2":                 "oklch(0.6718 0.1782 140.42)",
    "--chart-3":                 "oklch(0.7441 0.1633 139.04)",
    "--chart-4":                 "oklch(0.8297 0.1145 137.50)",
    "--chart-5":                 "oklch(0.9621 0.0707 140.09)",
    "--sidebar":                 "oklch(0.2718 0.0339 139.79)",
    "--sidebar-foreground":      "oklch(0.9175 0.0249 137.81)",
    "--sidebar-primary":         "oklch(0.6038 0.1203 154.52)",
    "--sidebar-primary-foreground": "oklch(0.2027 0.0298 140.68)",
    "--sidebar-accent":          "oklch(0.3250 0.0545 140.79)",
    "--sidebar-accent-foreground": "oklch(0.9175 0.0249 137.81)",
    "--sidebar-border":          "oklch(0.3424 0.0420 139.71)",
    "--sidebar-ring":            "oklch(0.6718 0.1782 140.42)",
    "--radius":                  "0.5rem"
  },
  "meta": {
    "name": "Agroaromas",
    "initials": "AG",
    "defaultLocale": "es",
    "logo": "/ag.svg",
    "tagline": {
      "en": "Agricultural Aromas Platform",
      "es": "Plataforma de Gestión Agrícola"
    }
  }
}'
WHERE CompanyId = 'AG001';  -- ← replace with your actual AG CompanyId
