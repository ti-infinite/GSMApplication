# GSMGateway

Gateway basado en **YARP** para la plataforma GSM.

## Objetivo

- Validar JWT en el borde.
- Extraer `companyId` desde el token.
- Inyectar automáticamente el header `X-Company-Id` hacia los microservicios downstream.
- Hacer de punto de entrada único del ecosistema GSM.

## Proyectos

- `GSMGateway.Api`: hosting HTTP, Swagger y YARP.
- `GSMGateway.Business`: reglas de aplicación para resolver tenant desde claims.
- `GSMGateway.Abstractions`: contratos.
- `GSMGateway.Entities`: constantes, opciones y modelos livianos.
- `GSMGateway.Tenant`: contexto/middleware de tenant.
- `GSMGateway.Infrastructure`: lectura de claims JWT.

> No se crea `DataAccess` por diseño: el gateway no persiste datos y agregar esa capa rompería YAGNI y aumentaría acoplamiento sin valor.

## Rutas configuradas

- `POST /api/security/v1/auth/login` → proxied a `https://localhost:7101/api/v1/auth/login`
- `GET /swagger/security/v1/swagger.json` → proxied a `https://localhost:7101/swagger/v1/swagger.json`
- `GET /health` → salud del gateway

## Flujo multi-tenant

1. El usuario se autentica contra `GSMAuth`.
2. `GSMAuth` emite un JWT con `sub`, `companyId` y `role`.
3. El cliente llama al `GSMGateway` con `Authorization: Bearer ...`.
4. El middleware del gateway extrae `companyId` del JWT.
5. El gateway elimina cualquier `X-Company-Id` enviado por el cliente y agrega el valor confiable del token.
6. El microservicio downstream recibe `X-Company-Id` y resuelve su base de datos tenant.