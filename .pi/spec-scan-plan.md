# Specification Scanning Plan for Kassir Desktop App

## Phase 1: Project Identity & Build Configuration
- [x] Read `package.json` — name, version, scripts, dependencies
- [x] Read `Cargo.toml` — Rust dependencies, Tauri plugins
- [x] Read `tauri.conf.json` — app config, windows, plugins, updater, bundle
- [x] Read `vite.config.ts` — build tooling, plugins
- [x] Read `.env.development.local` and `.env.production` — environment variables
- [x] Read `tsconfig.json`, `bunfig.toml`

## Phase 2: Backend (Tauri/Rust)
- [x] Read `src-tauri/src/lib.rs` — plugin setup, Rust commands
- [x] Read `src-tauri/src/main.rs` — entry point
- [x] Read `src-tauri/src/auth.rs` — password hash/verify (bcrypt)
- [x] Read `src-tauri/src/jwt.rs` — JWT encode/decode (HS256, 5-day expiry)
- [x] Read `src-tauri/src/printer.rs` — Windows printer enumeration & PDF printing (winprint)
- [x] Read `src-tauri/src/database/mod.rs` — 41 migrations for data.db
- [x] Read `src-tauri/src/transaction/mod.rs` — 6 migrations for tx.db
- [x] Read `src-tauri/src/api/mod.rs` — embedded Axum HTTP server (port 3000)
- [x] Read `src-tauri/capabilities/default.json` — Tauri permissions (core, sql, fs, http, etc.)

## Phase 3: Frontend Architecture
- [x] Read `src/route.tsx` — hash router, root layout, authenticated layout
- [x] Read `src/middleware/authenticate.ts` — auth guard (redirect to /login)
- [x] Read `src/lib/auth.ts` — localStorage user, bcrypt/JWT invoke wrappers, Effect-TS
- [x] Read `src/layouts/root.tsx` — root layout
- [x] Read `src/layouts/authenticated/index.tsx` — topbar, navigation, shortcuts

## Phase 4: Database Layer (Frontend SQLite)
- [x] Read `src/database/database-type.d.ts` — all DB.TypeScript interfaces (Product, Record, Cashier, etc.)
- [x] Read `src/database/index.ts` — 14 entity module exports
- [x] Read migration SQL files: 01, 36, 39, 40, 41 — schema evolution from INTEGER PK → TEXT (ULID) PK

## Phase 5: API Integration (Cloud Backend)
- [x] Read `src/lib/url.ts` — API URL builder from VITE_API_URL
- [x] Read `src/lib/reqwest.ts` — Effect-based HTTP fetch wrapper
- [x] Read `src/server/index.ts` — 5 API client entities (product, product-event, record, grave, method)

## Phase 6: State Management
- [x] Read `src/store/index.ts` — 6 store modules (size, owner, printer, info, method, sync)
- [x] Read store sync modules — token, product, product-event, record, grave, method

## Phase 7: Pages & Navigation
- [x] Read all 12 page route definitions (Login, Home, Shop, Stock, Money, Record, Analytics, Setting, Cashier, Customer, Method, Social)
- [x] Read Login page components (fresh form, login form, loader)
- [x] Read Shop page layout (left panel search, right panel transaction, complete dialog)
- [x] Read Setting page subroutes (profile, shop, data, log, printer, sync)
- [x] Read Analytics subroutes (cashflow, net, crowd, product, debt)

## Phase 8: Sync System
- [x] Read `src/lib/sync/index.ts` — 5 entity sync orchestrators (grave, method, product, product-event, record)
- [x] Read sync strategy: pull (GET /{entity}/{timestamp}), push (POST /{entity}), merge

## Phase 9: Utilities & Hooks
- [x] Read `src/lib/` — auth, printer, receipt builder, cache factory, constants, date, effect-error, log, validate
- [x] Read `src/hooks/` — use-user, use-product-search, use-screen, use-submit, etc.

## Phase 10: API Documentation
- [x] Read `backend-docs/openapi.yaml` — cloud API spec (auth schemes, sync protocol, schemas)
- [x] Document: cookieAdmin, cookieUser, bearerApp auth schemes
- [x] Document: timestamp-based pull/push sync protocol

---

## Output
- [x] Create `specification.xml` with all sections populated
