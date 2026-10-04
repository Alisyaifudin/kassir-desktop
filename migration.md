# Migrating from `Result.use` to `Loader` / `Consumer`

This guide walks through replacing the legacy [`Result`](./src/lib/result.ts)
hook with the Effect-native [`createLoader` / `Loader` / `Consumer`](./src/components/Loader.tsx)
pattern.

The migration is incremental: you can convert one page at a time.
`Result` and `Loader` coexist.

---

## Why migrate

| | `Result.use` (old) | `Loader` / `Consumer` (new) |
|---|---|---|
| State | Global `Map` keyed by a **string** | One `atom` per loader instance |
| Cache collisions | Possible across pages sharing a key | Impossible (identity = module variable) |
| Loading | `onLoading?.() ?? null` (no delay) | Built-in, with 200 ms anti-flash delay |
| Error typing | `E` inferred loosely (`= never` default) | `E` inferred from the effect |
| Defects | Reject as unhandled promise rejections | Re-thrown during render → route `ErrorBoundary` |
| Mutations | None | `setOptimistic` with automatic rollback |
| Revalidate | `Result.revalidate("some-key")` | `loader.run()` |

---

## The API in one screen

```ts
// src/components/Loader.tsx
export function createLoader<T, E>(
  effect: Effect.Effect<T, E>,
): LoaderResult<T, E>;
```

`LoaderResult<T, E>`:

| Member | Description |
|---|---|
| `loader.useData()` | `T` — read data. **Only under a successful `Consumer`** |
| `loader.useData(selector)` | `S` — subscribe to a slice of the data |
| `loader.useLoading()` | `boolean` — safe in any state |
| `loader.useResult()` | `LoaderState<T, E>` — safe in any state |
| `loader.run()` | `Promise<void>` — re-run the effect (revalidate) |
| `loader.setOptimistic(data, mutation?)` | `Promise<null \| E>` — optimistic update with rollback |

Components:

| Component | Description |
|---|---|
| `<Loader loader>` | Runs the effect on mount; re-throws defects to the nearest error boundary |
| `<Consumer loader loading Error>` | Renders `loading` / `Error` / `children` based on state |

Discriminated state:

```ts
type LoaderState<T, E> =
  | { type: "init";    isLoading: boolean }
  | { type: "success"; data: T; isLoading: boolean; error?: E }
  | { type: "error";   error: E; isLoading: boolean };
```

---

## Step-by-step

### 1. Replace `Result.use` with a module-scope loader

Before:

```tsx
const res = Result.use({
  fn: () => db.cashier.get.all(),
  key: "cashiers",
});
```

After:

```tsx
import { createLoader } from "~/components/Loader";

export const cashiersLoader = createLoader(db.cashier.get.all());
```

Key differences:

- `fn` returned an `Effect`; `createLoader` takes the `Effect` **directly**.
- There is **no `key`**. The loader variable's module identity is the cache/state.
  Do not copy `Result` keys over — they were global and could collide between
  unrelated pages.
- Create the loader at **module scope**, not inside the component, so its state
  survives re-renders. Module-scope loaders are also the revalidation handle.

### 2. Replace `Result.match` with `<Loader>` + `<Consumer>`

Before:

```tsx
return Result.match(res, {
  onLoading() {
    return <Loading />;
  },
  onError(error) {
    return <ErrorComponent>{error.e.message}</ErrorComponent>;
  },
  onSuccess(cashiers) {
    return <LoginForm cashiers={cashiers} />;
  },
});
```

After:

```tsx
import { Consumer, Loader } from "~/components/Loader";

export default function Page() {
  return (
    <Loader loader={cashiersLoader}>
      <Consumer
        loader={cashiersLoader}
        loading={<LoadingView />}
        Error={Error}
      >
        <Content />
      </Consumer>
    </Loader>
  );
}
```

- `<Loader>` starts the fetch on mount. `<Consumer>` renders the state.
- `loading` is a `ReactNode`. `Consumer` renders `null` for the first 200 ms so
  fast loads never flash a spinner.
- `Error` is a **component**, not a callback. It receives
  `{ error, isLoading, reload }`.

### 3. Move `onSuccess` into a child component

`useData()` is a hook and must run **under** a successful `<Consumer>`, so the
success branch becomes a component:

```tsx
function Content() {
  const cashiers = cashiersLoader.useData();
  return (
    <div className="flex flex-1 flex-col justify-center bg-zinc-950">
      {cashiers.length > 0 ? <LoginForm cashiers={cashiers} /> : <FreshForm />}
    </div>
  );
}
```

Use the selector overload to subscribe to a slice and avoid extra renders:

```tsx
const names = cashiersLoader.useData((cashiers) => cashiers.map((c) => c.name));
```

### 4. Move `onError` into an `Error` component

```tsx
import type { DbError } from "~/database/instance";

function Error({ error, reload }: { error: DbError; reload: () => void }) {
  console.error(error.e);
  return (
    <ErrorComponent title="Aplikasi bermasalah ☠">
      {error.e.message}
    </ErrorComponent>
  );
}
```

- `error` is the exact `E` from your `Effect`, fully typed.
- `reload` calls `loader.run()` — wire it to a retry button.
- Type the props with only what you need; `Consumer` passes all three.

### 5. Replace revalidation

Before:

```ts
Result.revalidate("cashiers"); // or Result.revalidate() for everything
```

After:

```ts
export function revalidateCashiers() {
  void cashiersLoader.run();
}
```

If several places must revalidate together, just call each loader's `run()`.

---

## Loading, errors, and defects

- **Typed failures** (`Effect.fail` / `E` channel) land in the `error` state and
  render your `Error` component.
- **Defects** (thrown/bugs) are re-thrown by `<Loader>` during render, so the
  nearest React error boundary handles them. Do **not** try to render defects in
  `Error`.
- A loader may be in one of the three states; `useLoading()` and `useResult()`
  are the safe reads anywhere in the tree.

---

## Mutations & optimistic updates

`setOptimistic(data, mutation)`:

1. Immediately writes `data` into the atom (`isLoading` stays `true` if a
   mutation is given).
2. Runs `mutation(data)`.
3. On `null`, keeps `data`.
4. On `E`, **rolls back** to the previous data and attaches the error.

The mutation's contract is value-based, not failure-based:

```ts
type OptimisticMutation<T, E> = (data: T) => Effect.Effect<null | E>;
```

`null` means success; an `E` value means failure. Example
([`src/hooks/use-size.ts`](./src/hooks/use-size.ts)):

```ts
export async function setSize(size: Size): Promise<null | string> {
  const error = await sizeLoader.setOptimistic(size, persist);
  return error === null ? null : error.e.message;
}

function persist(size: Size): Effect.Effect<null | StoreError> {
  return store.size.set(size).pipe(
    Effect.as(null),
    Effect.catchTag("StoreError", (error) => {
      log.error(error.e);
      return Effect.succeed(error); // report failure as a value
    }),
  );
}
```

If the UI has imperative side effects (e.g. a `<body>` class), drive them from
loader state so rollback also reverts them:

```tsx
function ApplySize() {
  const size = sizeLoader.useData();
  useEffect(() => {
    document.body.classList.toggle("small", size === "small");
  }, [size]);
  return null;
}
```

---

## Gotchas

1. **`useData()` only under a successful `Consumer`.** It throws otherwise.
   Read `useResult()` / `useLoading()` if you need state outside that branch.
2. **Hooks rules.** Never call `useData()` conditionally or after an early
   `return`; put it in a dedicated child component (as in step 3).
3. **No `key`.** Don't carry `Result` keys over. Two pages that used the same
   key shared state in the old system.
4. **Module scope.** Keep `createLoader(...)` outside the component. Creating it
   during render resets state every render.
5. **Dynamic effects (props/params).** `Result.use` accepted `deps`. With the
   loader pattern, for an effect that depends on a value, either:
   - create the loader once at module scope and pass the value into a fresh
     effect via `useMemo`, or
   - memoize the loader: `const loader = useMemo(() => createLoader(effect(id)), [id])`
     and render `<Loader>`/`<Consumer>` with it.
6. **Defects are not errors.** Let the `ErrorBoundary` deal with them.
7. **Import cycles.** If `root.tsx` (or a layout) both defines a loader and
   imports a helper that imports that loader back, move the shared helper (or
   the loader) into a neutral module. See how `applySize` lives in
   [`src/layouts/root.tsx`](./src/layouts/root.tsx) so
   [`src/hooks/use-size.ts`](./src/hooks/use-size.ts) can consume `sizeLoader`.
8. **`setOptimistic` returns `null | E`**, not `void`. Await it if you need the
   error message.
9. **The effect is shared.** All consumers of a module-scope loader see the same
   state. If two components need independent requests, define two loaders.

---

## Reference migrations

| File | What it shows |
|---|---|
| [`src/layouts/root.tsx`](./src/layouts/root.tsx) | App-boot loader, DOM side effect, error re-throw to boundary |
| [`src/pages/Login/page.tsx`](./src/pages/Login/page.tsx) | Simple fetch, branching success UI, full-page error |
| [`src/layouts/authenticated/z-Title.tsx`](./src/layouts/authenticated/z-Title.tsx) | Small inline loader + `revalidate` |
| [`src/hooks/use-size.ts`](./src/hooks/use-size.ts) | Reading via `useData`, mutation + rollback |

---

## Checklist

- [ ] Effect moved to a module-scope `createLoader(...)` (no `key`).
- [ ] `Result.match` replaced with `<Loader>` + `<Consumer>`.
- [ ] `onSuccess` body extracted into a component using `loader.useData()`.
- [ ] `onError` extracted into an `Error` component typed with the effect's `E`.
- [ ] `onLoading` replaced with the `loading` prop.
- [ ] `Result.revalidate(key)` replaced with `loader.run()`.
- [ ] Removed the now-unused `Result` import.
- [ ] `npx tsc --noEmit` and `npx eslint <file>` are clean.
