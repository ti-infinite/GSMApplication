# GSMApplication

Microservicio de aplicación de la plataforma GSM.

## Capas
- GSMApplication.Api
- GSMApplication.Business
- GSMApplication.Abstractions
- GSMApplication.Entities
- GSMApplication.DataAccess
- GSMApplication.Infrastructure
- GSMApplication.Tenant

## Endpoint inicial
- `GET /api/v1/application/getMenu`

## Comportamiento de getMenu
- Requiere Bearer token.
- Lee `idProfile` desde el JWT.
- Si el token actual aún no expone `idProfile`, hace fallback a `ClaimTypes.Role` para compatibilidad temporal con GSMAuth.
- Si puede leer el claim retorna `200 OK` con una respuesta por defecto.
- Si no puede leer el claim retorna `401 Unauthorized` con mensaje por defecto.

## Multi-tenant
- `TenantContext` mantiene el tenant actual de la request.
- `TenantExtensions` intenta obtener `X-Company-Id` desde el Gateway y, si no existe, usa el claim `companyId` del JWT como fallback para pruebas directas.
- `RegistryDbContext` resuelve el tenant desde la base central `TenantRegistryDb`.
 