# Codebase Conventions

## File Naming & Organization

### React Components
- **File name**: React component files start with `z-` prefix (e.g., `z-Complete/`, `z-Loading.tsx`, `z-Item.tsx`).
- **Component name**: The exported component/function name does **not** need the `z` prefix (e.g., file `z-Item.tsx` exports `function Item()`).
- **Reusable components**: Placed in `src/components/`.
- **Page-specific components**: Placed inside the page's own directory (e.g., `src/pages/Shop/z-Left/`). These are one-off, not reusable. Purpose: keep pages smaller and simpler to reason about.
- **UI primitives**: shadcn/ui-style components live in `src/components/ui/` (e.g., `button.tsx`, `dialog.tsx`, `input.tsx`).
- **Always refactor** large components into smaller, focused chunks. Massive components are hard to read.

### Page Structure
- **Page folders**: Use PascalCase (e.g., `Cashier/`, `Setting/`, `Shop/`, `Login/`).
- **Special files per page**:
  - `index.tsx` — Route definition (exports a `RouteObject`).
  - `page.tsx` — Default export: the page component.
  - `layout.tsx` — Default export: layout wrapper with `<Outlet />`.
  - `z-*.tsx` — Page-specific one-off components (e.g., `z-Item.tsx`, `z-Loading.tsx`).
- **Page-specific hooks**: Live in the page directory (e.g., `use-data.ts`, `use-update.ts`). Not reusable outside the page.

### Hooks
- **Reusable hooks**: Placed in `src/hooks/` (e.g., `use-call-effect.ts`, `use-submit.ts`, `use-screen.ts`).
- **Page-specific hooks**: Live in the respective page's directory.
- **Use custom hooks** for big/complex logic. For small logic, inline in the component is fine.

### Other Files
- **kebab-case**: All non-component files use kebab-case (e.g., `use-call-effect.ts`, `get-all.ts`, `del-by-id.ts`, `effect-error.ts`).
- **Database operations**: Each operation is a single file in `src/database/<domain>/` (e.g., `add.ts`, `get-all.ts`, `update-name.ts`).
- **Transaction operations**: Same pattern in `src/transaction/<domain>/`.
- **Server API calls**: Same pattern in `src/server/<domain>/`.
- **Store operations**: Same pattern in `src/store/<domain>/`.

### Import Alias
- Use `~/` alias to import from `src/` (e.g., `import { db } from "~/database"`, `import { cn } from "~/lib/utils"`).

---

## Module Barrel Pattern

Every domain module (database, transaction, store, server, lib/sync) follows this barrel export pattern:

```ts
// index.ts
import { all } from "./get-all";
import { byId } from "./get-by-id";
import { add } from "./add";
// ...

export const domainName = {
  get: {
    all,
    byId,
  },
  add: { new: add },
  update: { name: updateName, hash: updateHash },
  delete: delById,
};
```

- Operations are grouped under sub-objects: `get`, `add`, `update`, `delete`, `count`, `del`.
- Use **single-purpose files**: one exported function per file.

---

## Effect-Driven Architecture

### Core Principle
- **All async / might-fail function calls must use `Effect`** from the [`effect`](https://effect.website) library.
- Do not throw errors. Fail via `Effect.fail()` with a typed error.

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

### Wrapping Promises
Use `Effect.tryPromise()` to wrap Promise-based APIs:

```ts
Effect.tryPromise({
  try: () => invoke<string>("hash_password", { password }),
  catch: (e) => InvokeError.new(e, "Aplikasi bermasalah"),
})
```

### Pipe & Either
Use `pipe()` and `Effect.either` for pattern matching results at the boundary:

```ts
const res = await Effect.runPromise(pipe(fn(), Effect.either));
Either.match(res, {
  onLeft(error) { /* handle */ },
  onRight(value) { /* handle */ },
});
```

---

## Error Handling

### Error Class Convention
All error classes follow this pattern:

```ts
export class SomeError {
  readonly _tag = "SomeError";        // <-- Tag for discriminated union matching
  constructor(readonly e: Error) {}   // Constructor with typed fields
  static new(e: unknown) {            // Static factory: normalize unknown to typed
    if (e instanceof Error) return new SomeError(e);
    const unknown = new Error("Fallback message", { cause: e });
    return new SomeError(unknown);
  }
  static fail(msg: string) {          // Static factory: create and fail in one call
    return Effect.fail(new SomeError(new Error(msg)));
  }
}
```

- **Shared errors**: Defined in `src/lib/effect-error.ts` (e.g., `NotFound`, `TooMany`, `RequestError`, `ResponseError`, `BodyError`, `InvalidCredential`, `DuplicateError`, etc.).
- **Domain-specific errors**: Defined locally in the domain module (e.g., `DbError` in `src/database/instance.ts`, `TxError` in `src/transaction/instance.ts`, `StoreError` in `src/store/error.ts`).

### Catching Errors
Use `Effect.catchTag()` to catch specific tagged errors:

```ts
Effect.gen(function* () {
  // ...
}).pipe(
  Effect.catchTag("TooMany", (e) => {
    log.error(e.msg);
    return Effect.succeed(e.msg);
  }),
  Effect.catchTag("TxError", ({ e }) => {
    log.error(e);
    return Effect.fail(e.message);
  }),
);
```

### Pattern Matching in Components
Use `switch` on `error._tag` in React components:

```tsx
Result.match(res, {
  onError(error) {
    switch (error._tag) {
      case "TooMany":
        log.error(error.msg);
        return <ErrorComponent>Aplikasi bermasalah</ErrorComponent>;
      case "DbError":
        return <TextError>{error.e.message}</TextError>;
    }
  },
  // ...
});
```

---

## Data Fetching & State

### `Result.use` — Declarative Data Fetching
Use `Result.use()` from `src/lib/result.ts` for data that should be fetched on mount with caching:

```tsx
const res = Result.use({
  fn: () => db.cashier.get.all(),
  key: "cashiers",
});
```

- Supports optional `deps` array for re-fetching when deps change.
- Supports optional `revalidateOn` options.
- Global in-memory cache. Use `Result.revalidate()` or `Result.revalidate(key)` to invalidate.

### `Result.match` — Rendering States
Always use `Result.match()` for rendering async states:

```tsx
return Result.match(res, {
  onLoading() { return <Loading />; },
  onError({ e }) {
    log.error(e);
    return <TextError>{e.message}</TextError>;
  },
  onSuccess(cashiers) {
    return cashiers.map(c => <Item key={c.name} cashier={c} />);
  },
});
```

### `useCallEffect` — Imperative Async Calls
Use `useCallEffect` from `src/hooks/use-call-effect.ts` for user-triggered async operations (clicks, form submissions that are not form events):

```ts
const { loading, error, data, handler } = useCallEffect(
  (input: Input) => db.record.add(input)
);
```

### `useSubmit` — Form Submissions
Use `useSubmit` from `src/hooks/use-submit.ts` for form event handlers:

```ts
const { loading, error, handleSubmit } = useSubmit(
  (e) => myEffectProgram(),
  onSuccess,
);
```

### `CacheItem` — Client-Side Cache
Use `CacheItem<T extends { id: string }>` from `src/lib/cache-factory.ts` for in-memory caches of database entities. Supports `set`, `get`, `all()`, `update`, `delete`, `revalidate`.

---

## Routing

### Route Objects
Each page directory exports a route object:

```ts
// src/pages/Shop/index.tsx
export const shopRoute: RouteObject = {
  path: "shop",
  Component: () => (
    <Suspense fallback={<Loading />}>
      <Layout />
    </Suspense>
  ),
  children: [
    {
      index: true,
      Component: lazy(() => import("./z-Right/Header/z-NotFound")),
    },
    {
      path: ":tab",
      Component: () => (
        <Suspense fallback={<Loading />}>
          <Page />
        </Suspense>
      ),
      ErrorBoundary: lazy(() => import("./z-RedirectErrorBoundary")),
    },
  ],
};
```

### Code Splitting
- Use `lazy(() => import("./page"))` for page/layout components.
- Always wrap `lazy()` components in `<Suspense>` with a page-specific `<Loading />` fallback.
- The router uses `createHashRouter` from `react-router`.

### Middleware
Place route middleware in `src/middleware/`:

```ts
// src/middleware/authenticate.ts
export const authentication: MiddlewareFunction = async (_arg, next) => {
  const user = auth.get();
  if (user === undefined) throw redirect("/login");
  await next();
};
```

---

## UI Conventions

### Utility Components
Use these reusable components from `src/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| `Show` | `Show.tsx` | Conditional rendering (`when` or `value` prop) |
| `ForEach` | `ForEach.tsx` | List rendering with optional key extractor |
| `Spinner` | `Spinner.tsx` | Loading spinner, conditionally shown via `when` prop |
| `Loading` / `LoadingBig` / `LoadingFull` | `Loading.tsx` | Full-area loading indicators |
| `ErrorComponent` | `ErrorComponent.tsx` | Error display with back/home buttons |
| `TextError` | `TextError.tsx` | Inline error text |
| `Redirect` | `Redirect.tsx` | Imperative redirect (supports `hard` for window-level) |
| `Protect` | `Protect.tsx` | Role-based content gating |

### ClassName Composition
Use `cn()` from `src/lib/utils.ts` for merging Tailwind classes:

```tsx
<div className={cn("base-class", isActive && "active-class")} />
```

### Page Layout Pattern
Pages typically wrap content in:

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
Define page-specific skeleton components (usually a `Loading()` or `LoadingList()` function in the page file) using `<Skeleton>` from `src/components/ui/skeleton.tsx`.

---

## Database & Persistence

### Database Instance
- `DB.try()` wraps all SQLite operations with error handling. Defined in `src/database/instance.ts`.
- `TX.try()` same for transaction database. Defined in `src/transaction/instance.ts`.
- Both handle connection lifecycle (close on error, re-open on next call).
- Paths: `sqlite:data.db` and `sqlite:tx.db`.

### Cache Invalidation
- Database modules that cache data (e.g., `product/cache.ts`) expose a `cache.revalidate()` function.
- After mutations, call `cache.revalidate()` or update the cache directly using `cache.update(id, ...)`.

### Tauri Store
- Wrapped with Effect in `src/store/instance.ts`.
- Used for persistent app config (size, info, printer, method, sync token).
- Operations follow the same `{ get, set }` barrel pattern.

---

## Zod Schemas & Validation

- API responses are validated with Zod schemas defined alongside the request function.
- Form validation uses Zod via the `validate()` helper in `src/lib/validate.ts`.
- Custom Zod helpers (`numerish`, `numeric`, `integer`) are in `src/lib/utils.ts`.

---

## Logging

Use `log` from `src/lib/log.ts`:

```ts
log.error(e);    // Error | string
log.info("msg"); // string
```

Logs to both `console` and Tauri's log plugin.

---

## Type Definitions

- Database types are declared in a `DB` namespace in `src/database/database-type.d.ts`.
- Transaction types in `src/transaction/transaction-type.d.ts`.
- Component types are defined inline or in the same file.
- Use `z.infer<typeof schema>` for deriving types from Zod schemas.

---

## General Principles

1. **Files are small and single-purpose** — one function/operation per file.
2. **Refactor aggressively** — split large components into smaller ones.
3. **Custom hooks for big logic** — small logic stays inline in the component.
4. **Never throw** — always use `Effect.fail()` with typed errors.
5. **Match errors by `_tag`** — use `Effect.catchTag()` on the backend, `switch` on the frontend.
6. **Barrel exports everywhere** — modules re-export through `index.ts` with grouped sub-objects.
7. **Lazy load page components** — always use `lazy()` + `Suspense` with a page-specific Loading fallback.
