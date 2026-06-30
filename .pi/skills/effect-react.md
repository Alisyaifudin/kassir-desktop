# Effect-React Pattern

This project uses a disciplined integration of [Effect-TS](https://effect.website/) with React, designed for a Tauri desktop application. Every page, route, and service-backed component follows a consistent pattern.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Service Layer (Deep Dive)](#the-service-layer-deep-dive)
3. [Pattern 1: Route Definition](#pattern-1-route-definition-indextsx)
4. [Pattern 2: Page Assembly](#pattern-2-page-assembly-pagetsx)
5. [Pattern 3: Service-Backed Components](#pattern-3-service-backed-components-effect-tsx)
6. [Pattern 4: Lazy Loading](#pattern-4-lazy-loading-lazyeffect)
7. [Pattern 5: One-Shot Data Fetching](#pattern-5-one-shot-data-fetching-withloader)
8. [Pattern 6: Reactive State with StateWrap + useStatus](#pattern-6-reactive-state-with-statewrap--usestatus)
9. [Pattern 7: Mutable Data with AsyncDataState](#pattern-7-mutable-data-with-asyncdatastate)
10. [File Naming Conventions](#file-naming-conventions)
11. [Walkthrough: Adding a New Page](#walkthrough-adding-a-new-page)
12. [Deciding Which Pattern to Use](#deciding-which-pattern-to-use)
13. [Anti-Patterns](#anti-patterns)

---

## Architecture Overview

```
Route (index.tsx)
  └─ lazyEffect ──→ Page (page.tsx)
                      ├─ yield* Service        → hooks (useStatus, useData)
                      ├─ yield* effect-*.tsx   → React Component
                      └─ yield* effect-*.tsx   → React Component

Service (src/services/x/)
  ├─ index.ts     → Context.Tag with interface
  ├─ error.ts     → error types
  └─ live.ts      → Layer implementation using StatusState / AsyncDataState
```

### Three Layers

| Layer | File | Role |
|---|---|---|
| **Service Definition** | `src/services/*/index.ts` | Effect `Context.Tag` declaring capabilities |
| **Service Implementation** | `src/services/*/live.ts` | `Layer` with reactive state primitives |
| **Effect Component** | `effect-*.tsx` | `Effect.gen` yielding services, returning React component |
| **Page** | `page.tsx` | `Effect.gen` composing sub-effects into a page |
| **Route** | `index.tsx` | `Effect.gen` assembling lazy-loaded page + middleware |

---

## The Service Layer (Deep Dive)

Services are the backbone. They define capabilities via `Context.Tag` and provide reactive state primitives that React components consume through hooks.

### Service Definition (`index.ts`)

```tsx
// src/services/info/index.ts
import { Context, Effect } from "effect";
import { AsyncDataState, Status } from "~/lib/state";
import { InfoError } from "./error";

export type Info = { address: string; footer: string; header: string; name: string };

export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    load: () => Effect.Effect<void, InfoError>;
    useStatus: () => Status<InfoError>;
    info: AsyncDataState<Info, string>;
    showCashier: AsyncDataState<boolean, string>;
    set: {
      info: (info: Info) => Effect.Effect<Info, string>;
      showCashier: (show: boolean) => Effect.Effect<boolean, string>;
    };
  }
>() {}
```

**Key principles:**
- `load()` — triggers fetch/population, called once automatically by `StatusState`
- `useStatus()` — reactive hook returning `{ state: "loading" | "error" | "success", error? }`
- `AsyncDataState<T, E>` — reactive mutable data with optimistic writes (for forms, settings)
- Keep the interface focused on _what_ the service does, not _how_

### Service Implementation (`live.ts`)

The live implementation uses two reactive primitives from `~/lib/state`:

```tsx
// src/services/info/live.ts
import { Effect, Layer } from "effect";
import { InfoService, Info } from ".";
import { InfoError } from "./error";
import { AsyncDataState, StatusState } from "~/lib/state";

const InfoLayer = Layer.effect(
  InfoService,
  Effect.gen(function* () {
    // 1. Create data states with persistence functions
    const infoState = new AsyncDataState<Info, string>((data) =>
      store.info.set.info(data).pipe(
        Effect.catchTag("StoreError", ({ e }) => Effect.fail(e.message)),
      ),
    );

    // 2. Define the load logic
    const load = () =>
      Effect.gen(function* () {
        status.setLoading();
        status.notify();
        const data = yield* fetchEffect;
        infoState.setData(data);          // seed the AsyncDataState
        status.setSuccess();
      }).pipe(Effect.tapError((e) => status.setError(e)));

    // 3. Create the status state with load as its effect
    const status = new StatusState<InfoError>(load);

    // 4. Return the service implementation
    return InfoService.of({
      load,
      useStatus: status.useStatus,
      info: infoState,
      showCashier: showCashierState,
      set: { info: setInfo, showCashier: setShowCashier },
    });
  }),
);
```

### Reactive Primitives Reference

#### `StatusState<E>`

A one-shot state machine for async load operations. Exposes `useStatus()` React hook.

```
States: loading → success | error
```

| Method | Description |
|---|---|
| `new StatusState(loader)` | Create with an `Effect<void, E>` loader |
| `.useStatus()` | React hook → `{ state, error? }` |
| `.setLoading()` / `.setSuccess()` / `.setError(e)` | Transition state |
| `.notify()` | Trigger React re-render |

**Behavior:** The loader runs once on first mount. Subsequent mounts see the cached result. To force reload, create a new `StatusState` instance.

#### `AsyncDataState<T, E>`

Reactive mutable data with optimistic writes. Exposes `useData()` React hook.

```
States: success | loading (write in progress) | error (write failed, shows stale data)
```

| Method | Description |
|---|---|
| `new AsyncDataState(persistFn)` | Create with `(data: T) => Effect<void, E>` |
| `.useData()` | React hook → `{ data: T, state, error? }` |
| `.setData(data)` | Optimistic write — immediately updates UI, then persists |
| `.setError(e)` / `.setLoading()` | Manual state transitions |

**Behavior:** Must be seeded via `setData()` during the load phase. Writes are optimistic — the UI updates instantly, then the persist function runs. If it fails, the UI reverts to the previous value.

#### `DataState<T>`

Simple mutable state (no async persistence). Exposes `useData()` React hook.

| Method | Description |
|---|---|
| `new DataState(initial, setter)` | Create with initial value and setter function |
| `.useData()` | React hook → `T` |
| `.setData(data)` | Set value and notify listeners |

---

## Pattern 1: Route Definition (`index.tsx`)

Every route module exports an `Effect` that produces a React Router `RouteObject`.

```tsx
// src/pages/Home/index.tsx
import { Effect } from "effect";
import { Suspense } from "react";
import { lazyEffect } from "~/lib/lazy";

export const homeRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  return {
    index: true,
    Component: () => <Suspense><Page /></Suspense>,
  };
});
```

**With middleware:**

```tsx
export const loginRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  const loginMiddleware = yield* loginMiddlewareEffect;
  return {
    path: "login",
    middleware: [loginMiddleware],
    Component: () => <Suspense><Page /></Suspense>,
  };
});
```

**Key points:**
- Export name: `<name>RouteEffect` (distinguishes from plain `RouteObject` exports)
- `lazyEffect` combines `React.lazy` with Effect dependency injection
- Middleware services are yielded here, not in the page

---

## Pattern 2: Page Assembly (`page.tsx`)

Pages are `Effect.gen` functions that yield services and sub-components, then return a plain React component.

### Variant A: StateWrap (reactive data — preferred for read-heavy pages)

```tsx
// src/pages/Setting/Shop/page.tsx
const page = Effect.gen(function* () {
  const infoService = yield* InfoService;
  const useStatus = infoService.useStatus;
  const Info = yield* infoEffect;
  const CashierCheckbox = yield* cashierCheckbox;
  return function Page() {
    const status = useStatus();
    return (
      <StateWrap status={status} loading={<Loading />} error={({ e }) => <TextError>{e.message}</TextError>}>
        <Info />
        <CashierCheckbox />
      </StateWrap>
    );
  };
});
```

### Variant B: Composing sub-effects (no shared reactive state)

```tsx
// src/pages/Home/page.tsx
const page = Effect.gen(function* () {
  const NavGrid = yield* navGrid;
  const Header = yield* header;
  const StatsGrid = yield* statsGrid;
  return function Page() {
    return (
      <div>
        <Header />
        <StatsGrid />
        <NavGrid />
      </div>
    );
  };
});
```

### Variant C: WithLoader (one-shot fetch with inline UI)

```tsx
// src/pages/Login/page.tsx
const page = Effect.gen(function* () {
  const cashier = yield* CashierService;
  const FreshForm = yield* freshForm;
  const LoginForm = yield* loginForm;
  return function Page() {
    return (
      <WithLoader
        loader={cashier.get.all}
        error={({ e }) => <ErrorComponent title="Error">{e.message}</ErrorComponent>}
      >
        {(cashiers) => (cashiers.length === 0 ? <FreshForm /> : <LoginForm cashiers={cashiers} />)}
      </WithLoader>
    );
  };
});
```

---

## Pattern 3: Service-Backed Components (`effect-*.tsx`)

Each exports an `Effect.gen` that yields services, extracts hooks/lambdas, and returns a React component.

### Variant A: Reactive data via service hook (most common)

```tsx
// src/pages/Setting/Log/effect-readLog.tsx
export const readLogEffect = Effect.gen(function* () {
  const logService = yield* LogService;
  const useLogLines = logService.log.useData;
  return function ReadLog() {
    const { data: lines } = useLogLines();
    return (
      <>
        {lines.map((t, i) => (
          <p className="text-white text-small" key={i}>{t}</p>
        ))}
      </>
    );
  };
});
```

The component receives the hook from the service (closed over in Effect-land) and calls it in React-land. When `logService.log.setData()` is called elsewhere (e.g., by `load()` or `clear()`), this component re-renders automatically.

### Variant B: Action component via lambda (writes)

```tsx
// src/pages/Setting/Log/effect-clearLog.tsx
export const clearLogEffect = Effect.gen(function* () {
  const logService = yield* LogService;
  const clear = () => logService.clear();    // ← thunk, NOT the service object
  return function ClearLog() {
    const { loading, error, handleClear } = useClearLog(clear);
    return (
      <Button onClick={handleClear} variant="destructive">
        <Spinner when={loading} /> Bersihkan
      </Button>
    );
  };
});
```

**Critical rule:** Never pass the service object to React land. Extract the specific function/lambda in Effect-land and pass only that.

### Variant C: Form with reactive state (reads + writes)

```tsx
// src/pages/Setting/Shop/effect-info.tsx
export const infoEffect = Effect.gen(function* () {
  const infoService = yield* InfoService;
  const useInfo = infoService.info.useData;
  const setInfo = infoService.info.setData;
  return function Info() {
    const info = useInfo();
    const form = useForm({
      defaultValues: info.data,
      onSubmit({ value }) { return setInfo(value); },
    });
    return (
      <form onSubmit={...}>
        {/* fields bound to form, disabled when info.state === "loading" */}
        <Button disabled={isSubmitting}>Simpan <Spinner when={isSubmitting} /></Button>
        <TextError>{info.error}</TextError>
      </form>
    );
  };
});
```

### Variant D: Pre-bound lambdas for user actions (complex flows)

```tsx
// src/pages/Login/effect-freshForm.tsx
export const freshForm = Effect.gen(function* () {
  const hashService = yield* HashService;
  const cashierService = yield* CashierService;
  const runnable = (name: string, password: string) =>
    program(name, password).pipe(
      Effect.provideService(HashService, hashService),
      Effect.provideService(CashierService, cashierService),
    );
  return function FreshForm() {
    const { form, error } = useFreshForm(runnable);
    return <form>...</form>;
  };
});
```

The `program` function (defined outside the Effect.gen) declares its dependencies abstractly. The Effect.gen yields concrete service instances and creates a "runnable" — a partially-applied closure with services baked in. Only this closure crosses into React land.

### Variant E: Composable sub-effects

```tsx
export const incomeCard = Effect.gen(function* () {
  const BaseFinancialCard = yield* baseFinancialCard("in");
  return function IncomeCard() {
    return <BaseFinancialCard label="Pendapatan Hari Ini" icon={Wallet} ... />;
  };
});
```

---

## Pattern 4: Lazy Loading (`lazyEffect`)

```tsx
// src/lib/lazy.ts
export function lazyEffect<E, R>(
  loader: () => Promise<{ default: Effect.Effect<() => JSX.Element, E, R> }>,
): Effect.Effect<() => JSX.Element, E, R> {
  return pipe(
    Effect.runtime<R>(),
    Effect.map((rt) => {
      let page: (() => JSX.Element) | undefined;
      let pending: Promise<void> | undefined;
      return function Page() {
        if (page) return page();
        pending ??= Runtime.runPromise(rt)(
          pipe(Effect.promise(loader), Effect.flatMap((m) => m.default)),
        ).then((fn) => { page = fn; });
        use(pending);  // React 19 use() — suspends on promise
        return page!();
      };
    }),
  );
}
```

**Key points:**
- The imported module's `default` export must be an `Effect` that yields a React component
- `Runtime.runPromise` runs the Effect against the live service environment
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
  loading,   // ReactNode (optional)
  error,     // (error: E, retry: () => void) => ReactNode
}) {
  const [state, setState] = useState<State<T, E>>({ state: "loading" });
  const fetchData = useCallback(async () => {
    setState({ state: "loading" });
    const either = await Effect.runPromise(loader().pipe(Effect.either));
    Either.match(either, {
      onLeft(error) { setState({ state: "error", error }); },
      onRight(data)  { setState({ state: "success", data }); },
    });
  }, [loader]);
  useEffect(() => { fetchData(); }, []);
  // switch on state: loading → render loading, error → render error(retry), success → render children(data)
}
```

**Use when:** Data is fetched once, displayed, and never updated while the component is mounted.

---

## Pattern 6: Reactive State with `StateWrap` + `useStatus`

The primary pattern for read-heavy pages. The service manages loading state and data lifecycle.

### How it works

```
Service.load() → StatusState.loader()
  ├─ status.setLoading() → StateWrap shows <Loading />
  ├─ fetch data
  ├─ seed AsyncDataStates via setData()
  └─ status.setSuccess() → StateWrap shows children
```

### Page usage

```tsx
const page = Effect.gen(function* () {
  const service = yield* MyService;
  const useStatus = service.useStatus;
  const ReadView = yield* readEffect;
  const WriteAction = yield* writeEffect;
  return function Page() {
    const status = useStatus();
    return (
      <StateWrap
        status={status}
        loading={<Loading />}
        error={({ e }) => <TextError>{e.message}</TextError>}
      >
        <ReadView />
        <WriteAction />
      </StateWrap>
    );
  };
});
```

### Service definition

```tsx
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    load: () => Effect.Effect<void, MyError>;
    useStatus: () => Status<MyError>;
    data: AsyncDataState<MyData, string>;
    mutate: () => Effect.Effect<void, MyError>;
  }
>() {}
```

### Service live implementation

```tsx
const MyLayer = Layer.effect(MyService, Effect.gen(function* () {
  const dataState = new AsyncDataState<MyData, string>((data) =>
    persistEffect(data).pipe(Effect.catchTag("X", ({ e }) => Effect.fail(e.message))),
  );
  const load = () => Effect.gen(function* () {
    status.setLoading(); status.notify();
    const data = yield* fetchEffect;
    dataState.setData(data);
    status.setSuccess();
  }).pipe(Effect.tapError((e) => status.setError(e)));
  const status = new StatusState<MyError>(load);
  return MyService.of({
    load,
    useStatus: status.useStatus,
    data: dataState,
    mutate: () => Effect.gen(function* () {
      yield* mutateEffect;
      dataState.setData(newData);  // triggers re-render in all useData() consumers
    }),
  });
}));
```

---

## Pattern 7: Mutable Data with `AsyncDataState`

Used for forms and settings where the user edits data that must be persisted. Provides optimistic updates.

### How it works

```
User edits form → form.onSubmit → service.data.setData(newValue)
  ├─ UI updates immediately (optimistic)
  ├─ persist function runs
  │   ├─ success → state = "success", data = newValue
  │   └─ failure → state = "error", data = oldValue (reverted)
  └─ all useData() consumers re-render
```

### Service definition

```tsx
export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    load: () => Effect.Effect<void, ConfigError>;
    useStatus: () => Status<ConfigError>;
    theme: AsyncDataState<string, string>;
    size: AsyncDataState<string, string>;
  }
>() {}
```

### Component consuming the data

```tsx
export const selectTheme = Effect.gen(function* () {
  const config = yield* ConfigService;
  const useTheme = config.theme.useData;
  return function SelectTheme() {
    const { data: theme, state, error } = useTheme();
    const loading = state === "loading";
    return (
      <>
        <Select value={theme} onValueChange={(v) => config.theme.setData(v)} disabled={loading}>
          ...
        </Select>
        <TextError>{error}</TextError>
      </>
    );
  };
});
```

### Checklist for adding a new `AsyncDataState` field

1. Add field to service interface: `myField: AsyncDataState<T, E>`
2. Create instance in `live.ts`: `new AsyncDataState<T, E>(persistFn)`
3. Seed it during `load()`: `myField.setData(initialValue)`
4. Consume in `effect-*.tsx`: `const { data, state, error } = service.myField.useData()`
5. Write via: `service.myField.setData(newValue)`

---

## File Naming Conventions

| Prefix | Meaning | Example |
|---|---|---|
| `effect-` | Effect generator returning a React component | `effect-header.tsx`, `effect-loginForm.tsx` |
| `z-` | Pure React component (no Effect deps) | `z-StatsCard.tsx`, `z-Loading.tsx` |
| `page.tsx` | Page-level Effect.gen composing sub-effects | Every page directory |
| `index.tsx` | Route definition with `lazyEffect` | Every page directory |
| `util-` | Utility functions / schemas | `util-validate-product.ts` |

### Service file structure

```
src/services/<name>/
  ├── index.ts      # Context.Tag with interface
  ├── error.ts      # Error types (extend BaseError)
  └── live.ts       # Layer implementation
```

---

## Walkthrough: Adding a New Page

### Step 1: Define the service

```tsx
// src/services/example/index.ts
import { Context, Effect } from "effect";
import { AsyncDataState, Status } from "~/lib/state";
import { ExampleError } from "./error";

export class ExampleService extends Context.Tag("ExampleService")<
  ExampleService,
  {
    load: () => Effect.Effect<void, ExampleError>;
    useStatus: () => Status<ExampleError>;
    items: AsyncDataState<string[], string>;
  }
>() {}
```

```tsx
// src/services/example/error.ts
import { BaseError } from "~/lib/error-effect";
export class ExampleError extends BaseError("ExampleError") {}
```

```tsx
// src/services/example/live.ts
import { Effect, Layer } from "effect";
import { ExampleService } from ".";
import { ExampleError } from "./error";
import { AsyncDataState, StatusState } from "~/lib/state";

export const ExampleLayer = Layer.effect(
  ExampleService,
  Effect.gen(function* () {
    const itemsState = new AsyncDataState<string[], string>((data) =>
      Effect.succeed(data),  // replace with actual persistence
    );
    const load = () =>
      Effect.gen(function* () {
        status.setLoading(); status.notify();
        yield* Effect.sleep("1 second");  // simulate fetch
        itemsState.setData(["item-1", "item-2"]);
        status.setSuccess();
      }).pipe(Effect.tapError((e) => status.setError(e)));
    const status = new StatusState<ExampleError>(load);
    return ExampleService.of({
      load,
      useStatus: status.useStatus,
      items: itemsState,
    });
  }),
);
```

### Step 2: Create effect components

```tsx
// src/pages/Example/effect-list.tsx
import { Effect } from "effect";
import { ExampleService } from "~/services/example";

export const listEffect = Effect.gen(function* () {
  const service = yield* ExampleService;
  const useItems = service.items.useData;
  return function List() {
    const { data: items } = useItems();
    return (
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  };
});
```

### Step 3: Create the page

```tsx
// src/pages/Example/page.tsx
import { Effect } from "effect";
import { ExampleService } from "~/services/example";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { listEffect } from "./effect-list";

const page = Effect.gen(function* () {
  const service = yield* ExampleService;
  const useStatus = service.useStatus;
  const List = yield* listEffect;
  return function Page() {
    const status = useStatus();
    return (
      <StateWrap
        status={status}
        loading={<p>Loading...</p>}
        error={({ e }) => <TextError>{e.message}</TextError>}
      >
        <h1>Example Page</h1>
        <List />
      </StateWrap>
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
import { lazyEffect } from "~/lib/lazy";

export const exampleRouteEffect = Effect.gen(function* () {
  const Page = yield* lazyEffect(() => import("./page"));
  return {
    path: "example",
    Component: () => <Suspense><Page /></Suspense>,
  };
});
```

### Step 5: Register and provide the Layer

Register the route Effect in the parent router and provide the `ExampleLayer` at the application level so the runtime can satisfy the service dependency.

---

## Deciding Which Pattern to Use

| Scenario | Pattern | Key Component |
|---|---|---|
| Page loads data once, no updates | `WithLoader` | `WithLoader` |
| Page has multiple sub-views sharing data | `StateWrap` + `AsyncDataState` | `StateWrap`, `useStatus` |
| Form that persists on submit | `AsyncDataState` with form | `useData`, `setData` |
| Button triggers action (delete, clear) | Lambda passed to hook | `useClearLog(clear)` |
| Complex multi-step flow | Pre-bound runnable | `program(...).pipe(provideService(...))` |
| Lazy-loaded page | `lazyEffect` | `lazyEffect(() => import(...))` |

---

## Anti-Patterns

- **Don't pass service objects to React land** — extract lambdas/hooks in Effect-land, pass only those
- **Don't call `Effect.runPromise` inside render** — use `WithLoader`, `useEffect`, or service hooks
- **Don't import services directly in pure components** — always go through `Effect.gen`
- **Don't put business logic in `page.tsx`** — extract into `effect-*.tsx` files
- **Don't skip the `Effect.gen` layer** — even simple pages should yield their sub-components
- **Don't use `useState` for async data** — prefer `WithLoader` (one-shot) or `AsyncDataState` (reactive)
- **Don't manage loading/error state manually** — let `StatusState` and `StateWrap` handle it
- **Don't create a service without `useStatus`** — every data-loading service needs one
