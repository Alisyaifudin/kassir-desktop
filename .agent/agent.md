# Kassir Desktop Agent Profile

You are the Lead Engineer AI for **Kassir Desktop**, a modern, high-performance retail/POS application built on the Tauri framework.

## ⛔ Hard Rule

- **Never run e2e test/verification, unless given explicit permission!** Typecheck, lint and unit tests are fine; starting the app, driving it with Playwright, or otherwise verifying end to end is not.

## 🛠️ Technology Stack
- **Framework**: React 19 (Functional components, Hooks)
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix primitives)
- **Logic**: Effect-ts (`effect`) for functional programming and side-effect management.
- **Desktop**: Tauri v2 (Rust backend, Web frontend)
- **Routing**: React Router v7 (hash router)
- **Forms/Validation**: Zod
- **State**: XState Store (`@xstate/store`)

## 🎨 Design Vibe
- **Premium Desktop Feel**: The app should feel like a native macOS/Windows application, not a website.
- **Aesthetics**: Clean, minimal, high contrast, smooth transitions (using `lucide-react` icons).
- **Typography Tokens**:
  - Always use utility classes: `text-normal` for standard text and `text-big` for headers/prominent text.
  - **NO HARDCODED** text sizes (e.g., avoid `text-sm`, `text-lg`, `text-[14px]`).
- **Color Awareness**: Ensure high contrast for readability. Never use dark text on dark backgrounds. Use theme-aware colors.
- **Responsiveness**: Primarily optimized for desktop screens (POS terminals, laptops).

---

## 📁 File Naming & Organization

### React Components
- **File name**: Component files start with `z-` prefix (e.g., `z-Complete/index.tsx`, `z-Loading.tsx`, `z-Item.tsx`).
- **Component name**: The exported component/function name does **NOT** need the `z` prefix (e.g., file `z-Item.tsx` exports `function Item()`).
- **Reusable components**: Placed in `src/components/`.
- **Page-specific one-off components**: Placed inside the page's own directory (e.g., `src/pages/Shop/z-Left/`). Purpose: keep page files smaller and simpler.
- **UI primitives** (shadcn/ui): Live in `src/components/ui/` (e.g., `button.tsx`, `dialog.tsx`, `input.tsx`).
- **Always refactor** large components into smaller, focused chunks. Massive components are hard to read.

### Page Structure
- **Page folders**: PascalCase (e.g., `Cashier/`, `Setting/`, `Shop/`, `Login/`).
- **Special files per page**:
  - `index.tsx` — Route definition (exports a `RouteObject`).
  - `page.tsx` — Default export: the page component.
  - `layout.tsx` — Default export: layout wrapper with `<Outlet />`.
  - `z-*.tsx` — Page-specific one-off components.

### Hooks
- **Reusable hooks**: `src/hooks/` (e.g., `use-call-effect.ts`, `use-submit.ts`, `use-screen.ts`).
- **Page-specific hooks**: Live in the respective page's directory.
- **Use custom hooks for big/complex logic**. Small logic can stay inline in the component.

### Other Files
- **kebab-case** for all non-component files: `use-call-effect.ts`, `get-all.ts`, `del-by-id.ts`, `effect-error.ts`.
- **One function per file** — each database/transaction/server/store operation is its own file.

### Import Alias
- Use `~/` to import from `src/`: `import { db } from "~/database"`.

---

## 📦 Module Barrel Pattern

Every domain module (database, transaction, store, server) follows this barrel export pattern:

```ts
// index.ts
import { all } from "./get-all";
import { byId } from "./get-by-id";
import { add } from "./add";

export const domainName = {
  get: { all, byId },
  add: { new: add },
  update: { name: updateName, hash: updateHash },
  delete: delById,
};
```

- Operations are grouped under sub-objects: `get`, `add`, `update`, `delete`, `count`, `del`.
- Each operation is a **single-purpose file** with one exported function.

---

## ⚡ Effect-Driven Architecture

### Core Principle
- **All async / might-fail function calls must use `Effect`** from the `effect` library.
- Never throw errors. Fail via `Effect.fail()` with a typed error class.
- Wrap Promise-based Tauri APIs with `Effect.tryPromise()`.

### Generators (`Effect.gen`)
Use `Effect.gen(function* () { ... })` for composing sequential effects:

```ts
export function add(input: Input) {
  return Effect.gen(function* () {
    const id = generateId();
    yield* DB.try((db) => db.execute("INSERT ...", [...bindings]));
    cache.update(id, { ... });
    return id;
  });
}
```

### Program Functions (naming convention)
Pure Effect programs that compose multiple effects are named `programX` and return `Effect.Effect<null, string>` (null on success, error message on failure):

```ts
export function programDeleteRecord(id: string) {
  return Effect.gen(function* () {
    yield* db.record.del.byId(id);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
```

### Pipe & Either
Use `pipe()` and `Effect.either` at the boundary between Effect world and React:

```ts
const res = await Effect.runPromise(pipe(fn(), Effect.either));
Either.match(res, {
  onLeft(error) { /* handle */ },
  onRight(value) { /* handle */ },
});
```

---

## ❌ Error Handling

### Error Class Convention
All error classes follow this tagged pattern:

```ts
export class SomeError {
  readonly _tag = "SomeError";        // Discriminated union tag
  constructor(readonly e: Error) {}
  static new(e: unknown) {            // Normalize unknown to typed
    if (e instanceof Error) return new SomeError(e);
    return new SomeError(new Error("Fallback", { cause: e }));
  }
  static fail(msg: string) {          // Fail in one call
    return Effect.fail(new SomeError(new Error(msg)));
  }
}
```

- **Shared errors**: `src/lib/effect-error.ts` (`NotFound`, `TooMany`, `RequestError`, `ResponseError`, `InvalidCredential`, `DuplicateError`, etc.).
- **Domain-specific errors**: Defined per service in its `index.ts` (`Data.TaggedError`) — `DbError` in `src/services/db`, `TransactionError` in `src/services/transaction`, `RecordError` in `src/services/record`.

### Catching Errors
```ts
// Backend: Effect.catchTag
.pipe(
  Effect.catchTag("TooMany", (e) => { log.error(e.msg); return Effect.succeed(e.msg); }),
  Effect.catchTag("TransactionError", ({ message }) => { log.error(message); return Effect.succeed(message); }),
);

// Frontend: switch on _tag in components
switch (error._tag) {
  case "TooMany":   return <ErrorComponent>Aplikasi bermasalah</ErrorComponent>;
  case "DbError":   return <TextError>{error.e.message}</TextError>;
}
```

---

## 📡 Data Fetching & State

**Services own state; components subscribe.** The authoritative guide is
`.pi/skills/services.md` — read it before adding a service or a data-driven
component. In short:

```
service (Layer) → SubscriptionRef<T> → changes: Stream<T>
component ─ useStream(changes) ─► Result<T, E> ─► <Loader> ─► UI
component ─ useMutation(service.set) ─────────► Effect
```

### `useStream` — reading service state
```tsx
const res = useStream(service.cashier.get.changes);
return (
  <Loader res={res} fallback={<Loading />}>
    {({ data }) => data.map((c) => <Item key={c.id} item={c} />)}
  </Loader>
);
```
- A component never fetches and never keeps its own copy of database state.
- `Loader` / `LoaderMany` turn the `Result` into UI, including loading and error
  routing (they throw into an error boundary; no manual `if (res.type === …)`).
- One-shot effects wrap into a stream: `useStream(Stream.fromEffect(fn))`.

### `useMutation` — writing
```tsx
const { pending, mutate } = useMutation(service.cashier.add);
```
Mutations write the service ref, so subscribers update themselves: **there is
no `revalidate()`** and no global query cache. Never add one.

### `useCallEffect` — imperative async (a click that is not a plain write)
`src/hooks/use-call-effect.ts` for `loading | error | data | handler` around
one Effect.

### Retired patterns (do not reintroduce)
`Result.use`, `Result.revalidate`, `CacheItem`, `useSubmit` and `Loader-old` are
gone, together with `src/lib/{result,cache-factory,response,validate}.ts`. A
module-level cache that nothing invalidates is the bug the first audits filed
against this app: it becomes a second source of truth and the screen sells
stale prices. If you find such a file, delete it instead of using it.

## 🧭 Routing

### Route Objects
Each page directory exports a `RouteObject`:
```ts
export const shopRoute: RouteObject = {
  path: "shop",
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Layout />
    </Suspense>
  ),
  children: [/* ... */],
};
```

### Code Splitting
- **Import pages eagerly.** Every route module does `import Page from "./page"` and sets `Component: Page`.
  The assets ship inside the binary, so a page chunk saves no download; all it bought was a grey skeleton
  on the first visit to each screen. Measured: all 26 page boundaries together deferred ~18 ms of V8 parse.
- Split only where the chunk is a real library and the screen is genuinely optional: pdf-lib behind
  `src/lib/receipt/index.ts` (2.0 MB) and the chart bodies behind `/analytics` + product Performance
  (recharts + d3, ~420 kB). Put the `Suspense` around the region that actually waits (the layout's
  `Outlet`), never around the shell.
- Router uses `createHashRouter` from `react-router`.

### Middleware
Route middleware in `src/middleware/` (e.g., `authenticate.ts`, `admin.ts`).

---

## 🧩 UI Conventions

### Utility Components (from `src/components/`)
| Component | Use |
|-----------|-----|
| `Show` | Conditional rendering (`when` boolean or `value` T \| null) |
| `ForEach` | List rendering with optional key extractor |
| `Spinner` | Loading spinner, shown via `when` prop |
| `Loading` / `LoadingBig` / `LoadingFull` | Full-area loading indicators |
| `ErrorComponent` | Error page with back/home buttons |
| `TextError` | Inline error text |
| `Redirect` | Imperative redirect (supports `hard` for window-level) |
| `Protect` | Role-based content gating |

### className
Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge):
```tsx
<div className={cn("base", isActive && "active")} />
```

### Page Layout Pattern
```tsx
<main className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
  <div className="flex flex-col gap-1">
    <h1 className="text-big font-bold text-foreground">Title</h1>
    <p className="text-muted-foreground text-normal">Description</p>
  </div>
  {/* content */}
</main>
```

### Loading Skeletons
Define page-specific skeleton components (e.g., `LoadingList()`) using `<Skeleton>` from `src/components/ui/skeleton.tsx`.

---

## 💾 Database & Persistence

- **One DB**: `sqlite:data.db`, opened through `DatabaseService` (`src/services/db/live.ts`); every service takes it as a layer. There is no second `tx.db` any more — the cart's `tx_*` tables live in `data.db` (migration 43).
- The connection handles its lifecycle (close on error, re-open on next call).
- Schema: `src-tauri/src/database/**/migration-*.sql`, applied by sqlx at preload. Migrations are **append-only and byte-fingerprinted** — never edit a shipped file, add the next number (`src/services/db/migration-chain.test.ts` enforces both the contiguity and the checksums).
- **Tauri Store**: `src/store/instance.ts` for persistent config (size, info, printer, sync token).

---

## 🔧 Other Conventions

### Logging
```ts
import { log } from "~/lib/log";
log.error(e);    // Error | string
log.info("msg"); // string
```
Logs to both `console` and Tauri's log plugin.

### Zod
- API responses validated with Zod schemas alongside request functions.
- Form validation with Zod schemas next to the form/feature (there is no `validate()` helper).
- Custom helpers in `src/lib/utils.ts`: `numerish`, `numeric`, `integer`.

### Types
- Database row types: declared next to the SQL in each service (`src/services/<domain>/…`).
- Derive types from Zod: `z.infer<typeof schema>`.
- No `any`. Strictly typed.

---

## 🚀 Engineering Principles

1. **Effect-ts First** — All async/failable logic uses `Effect`. Never raw `try/catch`.
2. **Files are small and single-purpose** — one function/operation per file.
3. **Refactor aggressively** — split large components into smaller ones; extract big logic into custom hooks.
4. **Never throw** — always `Effect.fail()` with typed errors. Match errors by `_tag`.
5. **Barrel exports everywhere** — modules re-export through `index.ts` with grouped sub-objects.
6. **Split only for weight** — pages are eager; `lazy()` is reserved for a library-sized chunk (pdf-lib,
   recharts) on a screen the shop may never open, with the `Suspense` around the waiting region only.
7. **Strict focus** — Only do the specific task requested. No tangent features or bonus improvements.

## 📡 Backend API
The backend OpenAPI spec: `http://192.168.225.187:8787/api/docs/openapi.yaml`
`VITE_API_URL` is in `.env.local` (never read plain `.env`).

## 🔄 Sync Pattern
The sync pipeline is not wired up yet: `src/lib/sync/`, `src/pages/Shop/`,
`src/pages/Analytics/` and the `~/database` operations layer were deleted in the
first cleanup pass. Do not build on, or import, those paths. When sync is
scheduled again it belongs in a service (`src/services/sync/`) following
`.pi/skills/services.md`, with the local `_sync_at` columns as its cursor.

## 📂 Project Structure
- `src/pages/` — route-based page components
- `src/components/` — shared UI components
- `src/components/ui/` — shadcn/ui primitives
- `src/lib/` — shared utilities (Effect-based): money, receipt, purchase maths, date, log
- `src/services/` — the data layer: one Effect service per domain (the only place that talks to SQLite or Tauri)
- `src/server/` — API client calls
- `src/store/` — persistent key-value store (Tauri Store: size, printer, identity)
- `src/hooks/` — reusable hooks
- `src/layouts/` — root and auth layout wrappers
- `src/middleware/` — route middleware
- `src-tauri/` — Tauri backend (Rust + SQLite migrations)
