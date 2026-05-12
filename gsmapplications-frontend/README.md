# GSM Application — Frontend

SPA estática construida con Vite + React + TypeScript. Se despliega en AWS S3 + CloudFront.

## Stack

- **Vite** + React 19 + TypeScript
- **Tailwind CSS v4**
- **React Router v7** — routing client-side con prefijo de locale (`/en/`, `/es/`)
- **i18next** — internacionalización (EN / ES)
- **js-cookie** — manejo de sesión (JWT)

## Desarrollo local

```bash
cp .env.example .env.local   # configura los tenant IDs por defecto
npm install
npm run dev                  # http://localhost:5173
```

El proxy de Vite redirige `/api/*` → `https://localhost:7201` automáticamente. El backend debe estar corriendo localmente.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_TENANT_DEFAULT_EN` | CompanyId por defecto en login (inglés) |
| `VITE_TENANT_DEFAULT_ES` | CompanyId por defecto en login (español) |

## Build

```bash
npm run build   # genera dist/
```

## Deploy

El deploy se hace vía GitHub Actions (`.github/workflows/deploy-gmsfrontend.yml`).


- `develop` → environment `frontend-dev`
- `quality` → environment `frontend-qa`
- `main` → environment `frontend-prod`

Cada environment requiere las variables `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`, `TENANT_DEFAULT_EN`, `TENANT_DEFAULT_ES` y el secret `AWS_INFRA_ROLE_ARN`.