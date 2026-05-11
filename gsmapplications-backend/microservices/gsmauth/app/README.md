# GSMAuth

Microservicio de autenticación con soporte para arquitectura **Database Per Tenant**.
 
## Estructura por capas / proyectos

- `GSMAuth.Api`: capa de exposición HTTP/Swagger.
- `GSMAuth.Business`: lógica de negocio del login.
- `GSMAuth.Abstractions`: contratos e interfaces para DIP.
- `GSMAuth.Entities`: entidades y DTOs.
- `GSMAuth.Tenant`: contexto tenant y middleware transversal.
- `GSMAuth.Infrastructure`: hashing, JWT, repositorio e implementación de resolución tenant.
- `GSMAuth.DataAccess`: DbContext de EF Core (registro central + contexto tenant dinámico).

## Flujo Login

1. `POST /api/v1/auth/login`
2. Body: `IDCompany`, `User`, `Password`
3. Se consulta `TenantRegistryDb.Tenants` usando `IDCompany`
4. Se arma la conexión dinámica al tenant
5. Se consulta la tabla `Users` del tenant
6. Se valida estado/credenciales
7. Se devuelve JWT o mensaje de error

## Variable de entorno requerida

`TENANT_REGISTRY_CONNECTION`

Si no está definida, se usa `ConnectionStrings:TenantRegistryConnection` en `appsettings.json`.

## Notas

- La tabla `Users` necesita `PasswordHash` y `PasswordSalt`; los campos de negocio originales no son suficientes para validar contraseña.
- La capa Tenant es transversal y no contiene lógica de negocio.