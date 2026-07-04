# Effect-React Pattern

This project uses a disciplined integration of [Effect-TS](https://effect.website/) with React, designed for a Tauri desktop application. Every page, route, and service-backed component follows a consistent pattern.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Service Layer](#the-service-layer)
3. [Pattern 1: Route Definition](#pattern-1-route-definition-indextsx)
4. [Pattern 2: Page Assembly](#pattern-2-page-assembly-pagetsx)
5. [Pattern 3: Pure React Components](#pattern-3-pure-react-components-z-tsx)
6. [Pattern 4: Lazy Loading](#pattern-4-lazy-loading-lazyeffect)
7. [Pattern 5: One-Shot Data Fetching](#pattern-5-one-shot-data-fetching-withloader)
8. [Pattern 6: StateWrap](#pattern-6-statewrap)
9. [Pattern 7: Testing](#pattern-7-testing)
10. [File Naming Conventions](#file-naming-conventions)
11. [Walkthrough: Adding a New Page](#walkthrough-adding-a-new-page)
12. [Deciding Which Pattern to Use](#deciding-which-pattern-to-use)
13. [Anti-Patterns](#anti-patterns)

---

## Architecture Overview

```
Route (index.tsx)
  └─ lazyEffect ──→ Page (page.tsx)
                      ├─ yield* Service        → extract hooks & callbacks
                      ├─ Effect.runPromise     → bridge Effect → Promise
                      └─ props ──→ z-*.tsx     → Pure React component

Service (src/services/x/)
  ├── index.ts     → Context.Tag with interface
  └── error.ts     → error types
```

### Core Principle: Inject at Page Level Only

Services are **only** injected in `page.tsx` via `Effect.gen`. The page extracts hooks and callbacks from the service, then **prop drills** them to pure React components (`z-*.tsx`). Components never touch Effect directly.

```
Service injection boundary (Effect-land)
┌──────────────────────────────────────────────┐
│  page.tsx                                    │
│    yield* CashierService                     │
│    extract: useCashiers, delete, set.name …  │
│    Effect.runPromise(…) → bridge to async    │
└──────────────┬───────────────────────────────┘
               │ props (callbacks, hooks)
               ▼
┌──────────────────────────────────────────────┐
│  z-CashierList.tsx  (Pure React)             │
│  z-Item.tsx         (Pure React)             │
│  z-NewCashier.tsx   (Pure React)             │
│  z-Loading.tsx      (Pure React)             │
└──────────────────────────────────────────────┘
```

### Three Layers

| Layer | File | Role |
|---|---|---|
| **Service Definition** | `src/services/*/index.ts` | Effect `Context.Tag` declaring capabilities |
| **Page** | `page.tsx` | `Effect.gen` yielding services, extracting hooks/callbacks, composing pure components |
| **Component** | `z-*.tsx` | Pure React — receives everything via props |
| **Route** | `index.tsx` | `Effect.gen` assembling lazy-loaded page + middleware |

---

## The Service Layer

Services define capabilities via `Context.Tag`. They expose **hooks** (for reading reactive state) and **callbacks** (for writing/mutating). **All async methods return `Effect`** — the page bridges to Promise at the boundary via `promisify`.

### Service Definition (`index.ts`)

```tsx
// src/services/cashier/index.ts
import { Context, Effect } from "effect";
import { CashierError } from "./error";
import { NotFoundError } from "~/lib/error-effect";

export type Cashier = {
  name: string;
  role: DBNamespace.Role;
  id: string;
};

export class CashierService extends Context.Tag("CashierService")<
  CashierService,
  {
    loader(): Effect.Effect<void, CashierError>;       // Effect-based: void = success, CashierError = failure
    useCashiers(): Cashier[];                            // reactive hook
    get: {
      all(): Effect.Effect<Cashier[], CashierError>;
      byId(id: string): Effect.Effect<CashierFull, CashierError | NotFoundError>;
    };
    add: (input: { name: string; role: DBNamespace.Role; password: string }) =>
      Effect.Effect<Cashier, CashierError>;
    delete(id: string): Effect.Effect<void, CashierError>;
    set: {
      name(id: string, name: string): Effect.Effect<void, CashierError>;
      role: (id: string, role: DBNamespace.Role) => Effect.Effect<void, CashierError>;
    };
  }
>() {}
```

**Key principles:**
- `loader()` — returns `Effect<void, E>`, called once by `StateWrap` on mount
- `use*()` hooks — reactive read hooks returning current state
- Write methods (`delete`, `set.name`, `update`) — return `Effect<void, E>` for consistent error handling
- All async methods are Effect — bridged to Promises at page level via `promisify`
- **Flat service** — keep one `Context.Tag` per service. Don't split into sub-tags (e.g., `SocialAddService`, `SocialUpdateService`). Compose everything in a single interface
- Keep the interface focused on _what_ the service does, not _how_

### Error File (`error.ts`)

```tsx
// src/services/cashier/error.ts
import { BaseError } from "~/lib/error-effect";
export class CashierError extends BaseError("CashierError") {}
```

---

## Pattern 1: Route Definition (`index.tsx`)

Every route module exports an `Effect` that produces a React Router `RouteObject`.

```tsx
// src/pages/Cashier/index.tsx
import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { adminMiddlewareEffect } from "~/middleware/admin";
import { Loading } from "./z-Loading";

export const cashierRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const adminMiddleware = yield* adminMiddlewareEffect;
  const route: RouteObject = {
    middleware: [adminMiddleware],
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "cashier",
  };
  return route;
});
```

**Key points:**
- Export name: `<name>RouteEffect` (distinguishes from plain `RouteObject` exports)
- `lazyEffect` combines `React.lazy` with Effect dependency injection
- Middleware services are yielded here, not in the page
- Use the page's own `Loading` component as Suspense fallback

---

## Pattern 2: Page Assembly (`page.tsx`)

Pages are `Effect.gen` functions that yield services, extract hooks and callbacks, and return a plain React component that prop-drills everything to children.

```tsx
// src/pages/Cashier/page.tsx
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { CashierList } from "./z-CashierList";
import { NewCashier } from "./z-NewCashier";
import { UserService } from "~/services/user";
import { promisify } from "~/lib/promisify";

const page = Effect.gen(function* () {
  // 1. Yield all services needed by this page
  const cashierService = yield* CashierService;
  const userService = yield* UserService;

  // 2. Bridge Effect → Promise using promisify (extracts error message on failure)
  const onAdd = (name: string) =>
    promisify(
      () => cashierService.add({ name, role: "user", password: "" }),
      (e) => e.e.message,
    );
  const onDelete = (id: string) =>
    promisify(
      () => cashierService.delete(id),
      (e) => e.e.message,
    );
  const onUpdateName = (id: string, name: string) =>
    promisify(
      () => cashierService.set.name(id, name),
      (e) => e.e.message,
    );
  const onUpdateRole = (id: string, role: DBNamespace.Role) =>
    promisify(
      () => cashierService.set.role(id, role),
      (e) => e.e.message,
    );

  // 3. Return a plain React component
  return function Page() {
    return (
      <main className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Daftar Kasir</h1>
          <p className="text-muted-foreground text-normal">Kelola akun kasir dan peran pengguna</p>
        </div>
        {/* 4. Pass bridged callbacks and hooks as props to children */}
        <StateWrap
          loader={cashierService.loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <CashierList
            onDelete={onDelete}
            onUpdateName={onUpdateName}
            onUpdateRole={onUpdateRole}
            useCashiers={cashierService.useCashiers}
            useUser={userService.useUser}
          />
          <NewCashier onAdd={onAdd} />
        </StateWrap>
      </main>
    );
  };
});

export default page;
```

**Key points:**
- **Only yield services in `page.tsx`** — never in components
- **Extract callbacks and hooks** from the service (don't pass the service itself)
- **Use `promisify`** at the page level to convert Effect operations to Promise-based callbacks (`(input) => Promise<string | null>`)
- **Prop drill everything** — hooks and callbacks pass through props to `z-*` components
- The page is a default export (for `lazyEffect`)

### The `promisify` Bridge

`promisify` converts an Effect into a Promise that resolves to `null` on success or an error value on failure:

```typescript
// src/lib/promisify.ts
import { Effect, pipe } from "effect";

export function promisify<T, E>(effect: () => Effect.Effect<T, E>): Promise<null | E>;
export function promisify<T, E, E2>(
  effect: () => Effect.Effect<T, E>,
  transform: (e: E) => E2,
): Promise<null | E2>;
```

**Usage:**

```tsx
// Without transform — returns the raw error on failure
const onDelete = (id: string) => promisify(() => service.delete(id));

// With transform — maps the error to a user-friendly string
const onAdd = (name: string) =>
  promisify(
    () => service.add(name),
    (e) => e.e.message,  // CashierError → string
  );
```

This wraps Effect operations so components receive simple `(input) => Promise<string | null>` callbacks.

---

## Pattern 3: Pure React Components (`z-*.tsx`)

Components with the `z-` prefix are **pure React** — they have no Effect dependencies. Everything they need arrives via props.

### Read component (receives hooks as props)

```tsx
// src/pages/Cashier/z-CashierList.tsx
import { Cashier } from "~/services/cashier";
import { CashierItem } from "./z-Item";

type Props = {
  useUser: () => Cashier;
  useCashiers: () => Cashier[];
  onUpdateName: (id: string, name: string) => Promise<string | null>;
  onUpdateRole: (id: string, role: DBNamespace.Role) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function CashierList({ useUser, useCashiers, onDelete, onUpdateName, onUpdateRole }: Props) {
  const user = useUser();
  const cashiers = useCashiers();
  return (
    <div className="flex flex-col gap-2">
      {cashiers.map((cashier) => (
        <CashierItem
          key={cashier.id}
          cashier={cashier}
          currentUserName={user.name}
          onUpdateName={onUpdateName}
          onUpdateRole={onUpdateRole}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

### Action component (receives callbacks as props)

```tsx
// src/pages/Cashier/z-NewCashier.tsx
import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, /* ... */ } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";

type Props = {
  onAdd: (name: string) => Promise<string | null>;
};

export function NewCashier({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<null | string>(null);
  // Use standard React patterns (useState, useForm, etc.)
  // Call onAdd when needed — it's already a Promise, no Effect knowledge needed
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button asChild>
        <DialogTrigger>Tambah Kasir <Plus /></DialogTrigger>
      </Button>
      <DialogContent>
        {/* form that calls onAdd on submit */}
      </DialogContent>
    </Dialog>
  );
}
```

### Item component (receives data + callbacks as props)

```tsx
// src/pages/Cashier/z-Item.tsx
import { Cashier } from "~/services/cashier";

type ItemProps = {
  cashier: Cashier;
  currentUserName: string;
  onUpdateName: (id: string, name: string) => Promise<string | null>;
  onUpdateRole: (id: string, role: DBNamespace.Role) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function CashierItem({ cashier, currentUserName, onUpdateName, onUpdateRole, onDelete }: ItemProps) {
  // Component manages its own local state (loading, error, form values)
  // Calls onUpdateName / onDelete / onUpdateRole when user interacts
}
```

### Loading skeleton component

```tsx
// src/pages/Cashier/z-Loading.tsx
import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96" />
      {/* skeleton rows matching the real layout */}
    </div>
  );
}
```

**Key principles for `z-*` components:**
- **No `Effect.gen`** — they are plain functions
- **No `yield*`** — no service injection
- **No imports from `effect`** — no Effect types or utilities
- **Receive everything via props** — typed with TypeScript interfaces
- **Own their local UI state** — `useState` for form values, loading spinners, error messages, dialog open/close

---

## Pattern 4: Lazy Loading (`lazyEffect`)

```tsx
// src/lib/lazy.ts
export function lazyEffect<E, R, Props>(
  loader: () => Promise<{ default: Effect.Effect<(props: Props) => JSX.Element, E, R> }>,
): Effect.Effect<(props: Props) => JSX.Element, E, R> {
  // Combines React.lazy with Effect Runtime.runPromise
  // The imported module's default export must be an Effect (i.e., page.tsx)
}
```

**Key points:**
- The imported module's `default` export must be an `Effect` that yields a React component
- React's `use()` hook suspends on the promise
- The result is cached — subsequent renders return the cached component

---

## Pattern 5: One-Shot Data Fetching (`WithLoader`)

For simple fetch-on-mount scenarios where reactive updates aren't needed.

```tsx
// src/components/WithLoader.ts
export function WithLoader<T, E>({
  loader,    // () => Effect.Effect<T, E>
  children,  // (data: T) => ReactNode
  error,     // (error: E, retry: () => void) => ReactNode
  loading,   // ReactNode (optional)
}) { /* ... */ }
```

**Use when:** Data is fetched once, displayed, and never updated while the component is mounted. The loader is an Effect, bridged inside `WithLoader` via `Effect.runPromise`.

---

## Pattern 6: StateWrap

`StateWrap` is the primary pattern for pages that need to load data before rendering children. It calls the service's `loader()` once on mount.

```tsx
// src/components/StateWrap.tsx
import { useEffect, useState } from "react";
import { Status } from "~/lib/state";

export function StateWrap<E>({
  loader,    // () => Effect.Effect<T, E>  — bridged internally via promisify
  children,  // React.ReactNode
  error,     // (error: E) => React.ReactNode
  loading,   // React.ReactNode (optional)
}) {
  const [status, setStatus] = useState<Status<E>>({ state: "loading" });
  useEffect(() => {
    async function init() {
      const err = await promisify(loader);
      if (err !== null) {
        setStatus({ error: err, state: "error" });
      } else {
        setStatus({ state: "success" });
      }
    }
    init();
  }, [loader]);
  switch (status.state) {
    case "loading": return loading;
    case "error":   return error(status.error);
  }
  return children;
}
```

### How it works

1. `StateWrap` wraps `loader()` with `promisify` and calls it on mount
2. If `loader()` succeeds → children render
3. If `loader()` fails → error component renders
4. The `loader` function originates from the service (an Effect), which seeds reactive state before resolving

### Service `loader()` implementation pattern

```tsx
// In the service implementation, loader seeds reactive state then resolves:
function loader(): Effect.Effect<void, CashierError> {
  return Effect.gen(function* () {
    const data = yield* fetchFromStore;
    cashierState.setData(data);   // seed reactive state
    return;                        // void = success
  });
}
```

### Page usage

```tsx
<StateWrap
  loader={cashierService.loader}
  loading={<Loading />}
  error={({ e }) => <TextError>{e.message}</TextError>}
>
  <CashierList useCashiers={cashierService.useCashiers} /* ... */ />
  <NewCashier onAdd={add} />
</StateWrap>
```

**Important:** Pass `loader` (the function reference) to `StateWrap`, not the service object. The reactive hooks (`useCashiers`) are called **after** `StateWrap` succeeds, so the data is guaranteed to be seeded.

---

## Pattern 7: Testing

Tests use `Effect.provideService` / `Layer.succeed` to inject mock services. Mock objects are plain JavaScript objects matching the service interface.

### Page-level test

```tsx
// src/pages/Cashier/__test/page.test.tsx
import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { CashierService, CashierError } from "~/services/cashier";
import { UserService } from "~/services/user";
import page from "../page";
import { render } from "~/lib/render";

// 1. Define mock cashiers
const mockCashiers = [
  { name: "Budi", role: "admin", id: "1" },
  { name: "Ani", role: "user", id: "2" },
];

// 2. Build mock service factories (plain objects matching the interface)
function makeCashierService(opts?: {
  loader?: () => Effect.Effect<void, CashierError>;
  cashiers?: TestCashier[];
}): typeof CashierService.Service {
  const cashiers = opts?.cashiers ?? mockCashiers;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useCashiers: () => cashiers,
    add: (input) => Effect.succeed(input.name),
    delete: () => Effect.void,
    set: {
      name: () => Effect.void,
      role: () => Effect.void,
    },
    get: {
      all: () => Effect.succeed(cashiers),
      byId: () => Effect.fail(new CashierError(new Error("not implemented"))),
    },
  };
}

function makeUserService(opts?): typeof UserService.Service {
  const user = opts?.user ?? mockCashiers[0];
  return {
    loader: opts?.loader ?? (() => Promise.resolve(null)),
    useUser: () => user,
    user,
    setUser: () => Promise.resolve(null),
    logout: () => {},
  };
}

// 3. Test that the Effect resolves
describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.mergeAll(
      Layer.succeed(CashierService, makeCashierService()),
      Layer.succeed(UserService, makeUserService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// 4. Helper to render the page with mocks
function renderPage(cashierOpts?, userOpts?) {
  const Page = Effect.runSync(
    page.pipe(
      Effect.provideService(CashierService, makeCashierService(cashierOpts)),
      Effect.provideService(UserService, makeUserService(userOpts)),
    ),
  );
  return render(<Page />);
}

// 5. Test rendered output
describe("Page component", () => {
  test("renders heading", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /daftar kasir/i })).toBeInTheDocument();
  });

  test("shows loading when loader is pending", () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    deferred.resolve();
  });

  test("shows error when loader fails", async () => {
    renderPage({ loader: () => Effect.fail(new CashierError(new Error("Gagal"))) });
    expect(await screen.findByText(/Gagal/i)).toBeInTheDocument();
  });

  test("renders cashier list on success", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Budi")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Ani")).toBeInTheDocument();
    });
  });
});
```

**Key points:**
- Mock services are **plain objects** (no `Layer.effect` needed for simple cases)
- Mock service methods return `Effect.void` (success), `Effect.fail(error)` (failure), or `Effect.succeed(value)` (success with value)
- Use `Effect.provideService` for per-test injection
- Use `Layer.succeed` to wrap mock objects into layers
- `Effect.runSync(page)` returns the React component, then render as usual
- Test loading state with `Effect.promise(() => deferred.promise)` and `Promise.withResolvers()` to control resolution timing

---

## File Naming Conventions

| Prefix | Meaning | Example |
|---|---|---|
| `z-` | Pure React component (no Effect deps) | `z-CashierList.tsx`, `z-Loading.tsx` |
| `page.tsx` | Page-level `Effect.gen` composing services + components | Every page directory |
| `index.tsx` | Route definition with `lazyEffect` | Every page directory |

### Service file structure

```
src/services/<name>/
  ├── index.ts      # Context.Tag with interface (single flat tag)
  ├── error.ts      # Error types (extend BaseError)
  └── type.ts       # Shared types (optional)
```

**Note:** Services are **flat** — exactly one `Context.Tag` per service directory. Never split a service into multiple sub-tags (`SocialAddService`, `SocialUpdateService`, `UseSocials`). If you need to provide subsets of capabilities, extract at the page level — the page chooses which methods to bridge and pass down.

---

## Walkthrough: Adding a New Page

### Step 1: Define the service

```tsx
// src/services/example/index.ts
import { Context, Effect } from "effect";
import { ExampleError } from "./error";

export class ExampleService extends Context.Tag("ExampleService")<
  ExampleService,
  {
    loader(): Effect.Effect<void, ExampleError>;
    useItems(): Item[];
    addItem(item: Item): Effect.Effect<void, ExampleError>;
    deleteItem(id: string): Effect.Effect<void, ExampleError>;
  }
>() {}
```

```tsx
// src/services/example/error.ts
import { BaseError } from "~/lib/error-effect";
export class ExampleError extends BaseError("ExampleError") {}
```

### Step 2: Create pure React components

```tsx
// src/pages/Example/z-List.tsx
type Props = {
  useItems: () => Item[];
  onDelete: (id: string) => Promise<string | null>;
};

export function List({ useItems, onDelete }: Props) {
  const items = useItems();
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.name}
          <button onClick={() => onDelete(item.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// src/pages/Example/z-NewItem.tsx
type Props = {
  onAdd: (name: string) => Promise<string | null>;
};

export function NewItem({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const err = await onAdd(name);
    setLoading(false);
    setError(err);
    if (!err) setName("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button disabled={loading}>Add</button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
```

```tsx
// src/pages/Example/z-Loading.tsx
import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
```

### Step 3: Create the page

```tsx
// src/pages/Example/page.tsx
import { Effect } from "effect";
import { ExampleService } from "~/services/example";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { List } from "./z-List";
import { NewItem } from "./z-NewItem";
import { Loading } from "./z-Loading";

const page = Effect.gen(function* () {
  const service = yield* ExampleService;

  const onAdd = (item: Item) =>
    promisify(
      () => service.addItem(item),
      (e) => e.e.message,
    );
  const onDelete = (id: string) =>
    promisify(
      () => service.deleteItem(id),
      (e) => e.e.message,
    );

  return function Page() {
    return (
      <main className="flex flex-col gap-4 p-6">
        <h1>Example Page</h1>
        <StateWrap
          loader={service.loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <List useItems={service.useItems} onDelete={onDelete} />
          <NewItem onAdd={onAdd} />
        </StateWrap>
      </main>
    );
  };
});

export default page;
```

### Step 4: Create the route

```tsx
// src/pages/Example/index.tsx
import { Effect } from "effect";
import { Suspense } from "react";
import { RouteObject } from "react-router";
import { lazyEffect } from "~/lib/lazy";
import { Loading } from "./z-Loading";

export const exampleRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const route: RouteObject = {
    Component: () => (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    ),
    path: "example",
  };
  return route;
});
```

### Step 5: Register the route

Add the route Effect to `src/route.tsx`:

```tsx
import { exampleRouteEffect } from "./pages/Example/index.tsx";
// ... and yield it in routerEffect
const exampleRoute = yield* exampleRouteEffect;
// ... add to children array
```

---

## Deciding Which Pattern to Use

| Scenario | Pattern | Key Component |
|---|---|---|
| Page loads data before rendering children | `StateWrap` with `loader` prop | `StateWrap` |
| Component needs to read reactive data | Pass `use*` hook as prop | `z-*` component |
| Component triggers a mutation (create, update, delete) | Bridge at page level with `promisify`, pass callback as prop | `promisify` at page level |
| Simple one-shot fetch (no reactive updates) | `WithLoader` | `WithLoader` |
| Lazy-loaded page | `lazyEffect` | `lazyEffect(() => import(...))` |
| Form that persists on submit | Pass `onSubmit` callback as prop | Component manages local loading/error state |
| User action with dialog (delete confirmation) | Pass callback, component manages dialog state | Component owns `useState` for `open` |

---

## Anti-Patterns

- **Don't inject services in `z-*` components** — they are pure React, no `Effect.gen`, no `yield*`
- **Don't create `effect-*.tsx` files** — extract everything at the page level, prop drill to `z-*` components
- **Don't split a service into multiple `Context.Tag`s** — one flat tag per service directory. Use `SocialService` not `SocialAddService` + `SocialUpdateService` + `UseSocials`
- **Don't pass service objects to React land** — extract specific hooks/callbacks in `Effect.gen` at page level
- **Don't pass service methods directly to React components** — bridge with `promisify` at the page level
- **Don't call `Effect.runPromise` inside pages** — use `promisify` for the standard `Promise<string | null>` bridge
- **Don't import services directly in pure components** — they receive everything via props
- **Don't put business logic in `z-*.tsx`** — they render UI and own local UI state only
- **Don't manage loading/error state for page-level data in components** — let `StateWrap` handle it
- **Don't use `useState` for cross-component shared data** — that's what service `use*` hooks are for
- **Don't call service `use*` hooks before `StateWrap` succeeds** — wrap in `StateWrap` to guarantee data is loaded
