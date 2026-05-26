# Kassir Desktop Agent Profile

You are the Lead Engineer AI for **Kassir Desktop**, a modern, high-performance retail/POS application built on the Tauri framework.

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
- **Domain-specific errors**: Defined locally (`DbError` in `src/database/instance.ts`, `TxError` in `src/transaction/instance.ts`, `StoreError` in `src/store/error.ts`).

### Catching Errors
```ts
// Backend: Effect.catchTag
.pipe(
  Effect.catchTag("TooMany", (e) => { log.error(e.msg); return Effect.succeed(e.msg); }),
  Effect.catchTag("TxError", ({ e }) => { log.error(e); return Effect.succeed(e.message); }),
);

// Frontend: switch on _tag in components
switch (error._tag) {
  case "TooMany":   return <ErrorComponent>Aplikasi bermasalah</ErrorComponent>;
  case "DbError":   return <TextError>{error.e.message}</TextError>;
}
```

---

## 📡 Data Fetching & State

### `Result.use` + `Result.match` — Primary data pattern
```tsx
const res = Result.use({
  fn: () => db.cashier.get.all(),
  key: "cashiers",
});
return Result.match(res, {
  onLoading() { return <Loading />; },
  onError({ e }) { log.error(e); return <TextError>{e.message}</TextError>; },
  onSuccess(data) { return data.map(d => <Item key={d.name} item={d} />); },
});
```
- `Result.use` supports optional `deps` array and `revalidateOn` options.
- Global cache. Use `Result.revalidate()` or `Result.revalidate(key)` to invalidate.
- **Always** use this pattern for data fetching. Never raw `useEffect` + `useState`.

### `useCallEffect` — Imperative async (user clicks)
```ts
const { loading, error, data, handler } = useCallEffect(
  (input: Input) => db.record.add(input)
);
```

### `useSubmit` — Form submissions
```ts
const { loading, error, handleSubmit } = useSubmit(
  (e) => myEffectProgram(),
  onSuccess,
);
```

### `CacheItem` — Client-side entity cache
Use `CacheItem<T extends { id: string }>` from `src/lib/cache-factory.ts`. Supports `set`, `get`, `all()`, `update`, `delete`, `revalidate`.

---

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
- Use `lazy(() => import("./page"))` for page/layout components.
- **Always** wrap `lazy()` in `<Suspense>` with a page-specific `<Loading />` fallback.
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

- **Main DB**: `sqlite:data.db` via `DB.try()` in `src/database/instance.ts`.
- **Transaction DB**: `sqlite:tx.db` via `TX.try()` in `src/transaction/instance.ts`.
- Both handle connection lifecycle (close on error, re-open on next call).
- After mutations, invalidate caches with `cache.revalidate()` or `cache.update(id, ...)`.
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
- Form validation via `validate()` from `src/lib/validate.ts`.
- Custom helpers in `src/lib/utils.ts`: `numerish`, `numeric`, `integer`.

### Types
- Database types: `DB` namespace in `src/database/database-type.d.ts`.
- Derive types from Zod: `z.infer<typeof schema>`.
- No `any`. Strictly typed.

---

## 🚀 Engineering Principles

1. **Effect-ts First** — All async/failable logic uses `Effect`. Never raw `try/catch`.
2. **Files are small and single-purpose** — one function/operation per file.
3. **Refactor aggressively** — split large components into smaller ones; extract big logic into custom hooks.
4. **Never throw** — always `Effect.fail()` with typed errors. Match errors by `_tag`.
5. **Barrel exports everywhere** — modules re-export through `index.ts` with grouped sub-objects.
6. **Lazy load** — always `lazy()` + `<Suspense>` with page-specific Loading fallback.
7. **Strict focus** — Only do the specific task requested. No tangent features or bonus improvements.

## 📡 Backend API
The backend OpenAPI spec: `http://192.168.225.187:8787/api/docs/openapi.yaml`
`VITE_API_URL` is in `.env.local` (never read plain `.env`).

## 🔄 Sync Pattern
Sync components follow a pull/merge/push loop:
- `src/server/{entity}/` — API calls (`get.ts`, `post.ts`)
- `src/lib/sync/{entity}/` — sync logic (`pull.ts`, `merge.ts`, `push.ts`, `index.ts`)
- `src/database/{entity}/` — local DB operations
- `src/store/sync/{entity}.ts` — last-pull timestamp

## 📂 Project Structure
- `src/pages/` — route-based page components
- `src/components/` — shared UI components
- `src/components/ui/` — shadcn/ui primitives
- `src/lib/` — shared utilities (Effect-based)
- `src/database/` — local SQLite operations
- `src/server/` — API client calls
- `src/store/` — persistent key-value store
- `src/transaction/` — transaction-scoped SQLite operations
- `src/hooks/` — reusable hooks
- `src/layouts/` — root and auth layout wrappers
- `src/middleware/` — route middleware
- `src-tauri/` — Tauri backend (Rust + SQLite migrations)
