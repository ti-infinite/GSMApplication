# Stack

Aplicación **Vite 6 + React 19 + TypeScript 5**. Servidor de desarrollo con
`npm run dev` (Vite), build de producción con `tsc -b && vite build`. Enrutamiento
con `react-router-dom`, sin SSR ni App Router.

## Arquitectura (estilo Feature-Sliced Design)

```
src/
  app/        # bootstrap de la app, providers globales, router
  entities/   # dominios reutilizables (p.ej. entities/trx = motor de transacciones)
  features/   # funcionalidad concreta compuesta de entidades
  layouts/    # shells de layout (sidebar, header, etc.)
  pages/      # una carpeta por página/ruta (adjust, expense, purchase-orders, ...)
  shared/     # UI genérica, hooks, api client generado, utils
```

## Cliente API generado (orval) — no editar a mano

`shared/api/*/endpoints` y `shared/api/*/model` se generan con **orval** a partir de
los swagger de los 3 microservicios (`swagger/gsm-auth.json`, `gsm-application.json`,
`gsm-operations.json`). Flujo:

```
npm run swagger:refresh   # baja los swagger.json desde los servicios .NET corriendo en localhost:8081/82/83
npm run generate          # orval → regenera endpoints/model
npm run api:sync          # ambos pasos juntos
```

`predev`/`prebuild` corren `orval` automáticamente. Si vas a tocar contratos de API,
el cambio va en el backend (.NET) primero, luego se resincroniza aquí — nunca edites
los archivos generados directamente.

## Patrón TrxModule (`entities/trx`)

Los módulos de transacciones (Adjust, Expense, Purchase Order, Requirements, y los
que falten por migrar: Invoice, Reception, Verification) siguen un patrón de
"motor genérico + registry específico":

- La página es un wrapper delgado: define `PREFIX` (tipo de TRX, p.ej. `AJT`, `GST`,
  `OCM`, `REQ`), arma un `registry` con `buildRegistry({ fetchers, computeds })` y
  renderiza `<TrxModule prefix={PREFIX} registry={registry} .../>`.
- El formulario/tabla/workflow (`JsonFront`/`JsonREA`/`JsonWorkflow`) se trae del
  **backend** vía `useTrxConfig(prefix)` (endpoint `filtered-trxDefinitions`), con
  caché SWR en IndexedDB. **No hardcodees el `JsonConfig` en el frontend** — eso es
  el patrón viejo (mock) que se está reemplazando.
- Los `fetchers` del registry deben llamar a endpoints reales del backend, no a
  IndexedDB local (`shared/lib/idb`) ni datos hardcodeados — eso también es parte
  del patrón viejo a migrar.

## Multi-tenant

El tenant activo viaja en la cookie `gsm_company` y se usa como parte de las keys de
caché (IndexedDB, config). El build también acepta `VITE_TENANT_DEFAULT` /
`VITE_TENANT_IDS` (ver `.env.example` en la raíz del repo).

## Skills disponibles (`.claude/skills/`, se activan solas)

Antes de resolver algo a mano, revisa si ya hay una skill que lo cubre — se activan
por descripción, o se fuerzan con `/nombre`:

- **fsd-architecture** — SIEMPRE que decidas dónde va un archivo nuevo o cómo
  estructurar una carpeta. Es la autoridad sobre la organización de `src/`.
- **trx-engine** — al crear o modificar un módulo de transacción (Adjust, Expense,
  Order, Requirements, Invoice, Reception, Verification). Playbook completo del
  patrón config-driven descrito arriba.
- **design-system** — al tocar UI, mockups o material visual/marketing (tokens
  OKLCH, tipografía, componentes reales del producto).
- **wireframe-to-video** — al convertir un wireframe/mockup en video animado
  (Remotion) del producto.
- **architecture-designer** / **microservices-architect** — al diseñar o revisar
  arquitectura de sistema (ADRs, boundaries de servicios, trade-offs, escalabilidad).
- **csharp-developer** / **dotnet-core-expert** — al escribir código del backend
  (.NET 8, ASP.NET Core, EF Core, CQRS/MediatR).
- **playwright-expert** — al escribir o depurar tests E2E.
- **owasp-top-10** — en auditorías de seguridad o al tocar código sensible (auth,
  inputs, datos de terceros).
- **code-review-skill** (personal, `~/.claude/skills`) — al revisar PRs o diffs.
- **typescript-react-patterns** (personal, `~/.claude/skills`) — al tipar
  componentes, hooks o genéricos en TS+React.
