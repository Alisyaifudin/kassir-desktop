---
name: services
description: Best practices and patterns for the Kassir service layer and React data flow — Effect services (Context.Tag + Layer + SubscriptionRef), the app-level `service` object, useStream/useMutation, Loader/LoaderMany, createErrorBoundary/createManyErrorBoundary, and the single stock-Tailwind type/icon scale. Use whenever adding or modifying a service, writing a component that reads service data, wiring layers, or migrating old `db`/`store`/`use-data`/`Loader-old` code. Page-level async data has its own skill: `page-data`.
---

# Kassir Services & Data Flow

How this project does state, data fetching, loading, and errors. Follow these
patterns exactly; when migrating old code, convert to this model rather than
patching it.

## Mental model

- **Services own state.** Each domain concern is an Effect service backed by a
  single `SubscriptionRef` (the one source of truth).
- **Components subscribe, never fetch.** Leaves read a `Stream` via `useStream`;
  writes run Effects via `useMutation` or directly.
- **`Result` drives rendering.** `Loader` / `LoaderMany` turn a `Result` (or
  several) into UI, including loading and error routing.

```
service (Layer)  →  SubscriptionRef<T>  →  changes: Stream<T>
                                               │
component ── useStream(changes) ──► Result<T, E> ──► <Loader> ──► UI
component ── useMutation(service.set) ─────────────► Effect
```

---

## 1. Service anatomy

Every service is a folder `src/services/<name>/` with two files.

### `index.ts` — interface only

- The `Data.TaggedError` class.
- Domain types.
- A `Context.Tag` with the method signatures.

**Do NOT put implementation comments here.** No "reads from localStorage",
"caches", "loads from DB". Describe the contract (or nothing).

```ts
import { Effect, Context, Data, Stream } from "effect";

export class CashierError extends Data.TaggedError("CashierError")<{ message: string }> {}

export type Cashier = { id: string; role: "admin" | "user"; name: string };

export class CashierService extends Context.Tag("CashierService")<
  CashierService,
  {
    get: {
      all: () => Effect.Effect<Cashier[], CashierError>;
      byId: (id: string) => Effect.Effect<CashierFull, CashierError | NotFound>;
      changes: Stream.Stream<Cashier[], CashierError>;
    };
    set: { name: (id: string, name: string) => Effect.Effect<void, CashierError> };
    delete: (id: string) => Effect.Effect<void, CashierError>;
    add: (cashier: CashierFull) => Effect.Effect<void, CashierError>;
  }
>() {}
```

### `live.ts` — the Layer

Rules:

- `Layer.effect(Tag, Effect.gen(...))`; acquire backend services with `yield*`.
- Hold state in **one** `SubscriptionRef`. Mutations write the backend **then**
  the ref, so subscribers see the change.
- Seed with a default/empty value so **layer construction stays synchronous**
  (the app bootstraps with `Effect.runSync`). Hydrate lazily.
- Expose `changes` with `Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes)))`
  so `useStream` stays in `init` until the first real value arrives.
- Names: private `load` / `hydrate` / `ensureLoaded`. **Do not expose
  `revalidate`** unless something outside the service can change the data.

```ts
import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { CashierError, CashierService, type Cashier } from ".";
import { DatabaseService } from "../db";

export const CashierLive = Layer.effect(
  CashierService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const ref = yield* SubscriptionRef.make<Cashier[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Cashier[], CashierError> {
      return db.selectMany<Row>(SELECT_ALL).pipe(
        Effect.mapError((e) => new CashierError({ message: e.message })),
        Effect.map((rows) => rows.map(rowToCashier)),
      );
    }

    function hydrate(): Effect.Effect<void, CashierError> {
      return Effect.gen(function* () {
        const cashiers = yield* load();
        yield* SubscriptionRef.set(ref, cashiers);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, CashierError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref))),
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes))),
      },
      add: (cashier) =>
        Effect.gen(function* () {
          yield* insert(cashier);
          yield* SubscriptionRef.update(ref, (list) => sort([...list, cashier]));
        }),
    };
  }),
);
```

### Hidden vs public layers

- **Hidden backends** (never exposed on `service`): `db` (SQLite),
  `store` (Tauri plugin-store), `local-storage`.
- **Public domain services** (exposed on `service`): `config`, `cashier`,
  `auth`, `info`.

### App composition — `src/services/index.ts`

`Layer.mergeAll` does **not** resolve inter-layer dependencies — it unions
requirements. Use `Layer.provide` for dependencies.

```ts
const hiddenLive = Layer.mergeAll(DatabaseLive, LocalStorageLive, StoreLive);

const cashierLive = CashierLive.pipe(Layer.provide(hiddenLive));
const configLive = ConfigLive.pipe(Layer.provide(hiddenLive));
const infoLive = InfoLive.pipe(Layer.provide(hiddenLive));
// services that depend on other public services use those too:
const authLive = AuthLive.pipe(Layer.provide(hiddenLive), Layer.provide(cashierLive));

const appLive = Layer.mergeAll(configLive, cashierLive, authLive, infoLive);

export const service = Effect.runSync(
  Effect.gen(function* () {
    return {
      config: yield* ConfigService,
      cashier: yield* CashierService,
      auth: yield* AuthService,
      info: yield* InfoService,
    };
  }).pipe(Effect.provide(appLive)),
);
```

`service.<name>` is a plain object whose methods return `Effect`s / `Stream`s.
This is why components can do `service.cashier.get.changes` with no provider.

### `loaded` flag

Only services that cache a **domain value** need it (to tell "not hydrated"
from "hydrated empty"). Backends that cache a handle (`_getDb`, `_getStore`) do
not. It also gives retry for free: on failure `loaded` stays `false`.

---

## 2. `src/components/Loader.tsx`

### `useStream(stream, initial?)`

Subscribes a hot stream to React state; returns a `Result<T, E>`. Interrupts the
fiber on unmount.

```ts
export type Result<T, E> =
  | { type: "init" }
  | { type: "success"; data: T }
  | { type: "error"; error: E };
```

- Use for **hot/multicast** streams (`SubscriptionRef.changes`). Multiple
  subscribers share one source of truth.
- One-shot Effect? Wrap it: `useStream(Stream.fromEffect(effect))`.
- Synchronous signal? Pass a snapshot thunk as `initial` to avoid an init flash:
  ```ts
  useStream(service.config.productView.get, () => Effect.runSync(service.config.productView.get()));
  ```

### `useMutation(run)`

Runs an Effect on demand (event handlers, submits). Returns
`{ pending, error, data, mutate }`; `mutate(input)` resolves with an
`Either<A, E>`.

```tsx
const { pending, mutate } = useMutation(service.config.productView.set);
<button disabled={pending} onClick={() => void mutate("table")}>Tabel</button>
```

### `<Loader>`

```tsx
<Loader res={res} fallback={<Loading />}>
  {({ data }) => <View data={data} />}
</Loader>
```

- `init` → `fallback` (delayed by `delay` ms, default 200, so fast loads don't
  flash).
- `error` → **throws** the typed error to the nearest boundary.
- `success` → children (or the render prop), typed.

### `<LoaderMany>`

Several results at once, one loading UI, one error boundary:

```tsx
<LoaderMany res={{ auth, cashiers }} fallback={<LoadingView />}>
  {({ auth: user, cashiers }) => (user !== null ? <Redirect to="/" /> : <Form cashiers={cashiers} />)}
</LoaderMany>
```

It waits for all results, throws the first error, and hands back the resolved
data keyed by the same names.

### Page-level data — see `.pi/skills/page-data.md`

`createPageData` / `Gate` gate a **widget** instead of a page: the page owns the
subscriptions, each part reads only the keys it needs, and static chrome paints on
the first frame. Its full guide — fine-grained value placeholders, reserved card
heights, the 200 ms anti-flash window, `useMutation`/`refetching`, `Provider deps`
— lives in the **`page-data` skill**, with `src/pages/Home` as the reference
implementation. Read that skill before writing or migrating any page that loads
data.

## 3. Error boundaries — `src/components/createErrorBoundary.tsx`

`<Loader>` throws; a boundary catches. Match the boundary's granularity to the
failure:

```tsx
// single error type
const InfoErrorBoundary = createErrorBoundary(InfoError);
// several error types (login has auth + cashier streams)
const LoginErrorBoundary = createManyErrorBoundary(AuthError, CashierError);

<LoginErrorBoundary fallback={LoginError}>
  <LoaderMany res={{ auth, cashiers }} fallback={<LoadingView />}>…</LoaderMany>
</LoginErrorBoundary>

function LoginError({ error }: { error: AuthError | CashierError }) {
  return <ErrorComponent title="Aplikasi bermasalah ☠">{error.message}</ErrorComponent>;
}
```

- The fallback receives `{ error }` typed to the class (or union).
- Non-matching errors are **rethrown** to an ancestor boundary — boundaries
  compose.
- Use a local typed boundary when a failure should not take down the whole page
  (e.g. the Topbar title).

---

## 4. Component rules

- A leaf that needs data calls `useStream(service.x.changes)` itself — do not
  prop-drill service data from a parent.
- Prefer `<Loader>` / `<LoaderMany>` over manual `if (res.type === …)` guards.
- Route-level errors bubble to the route `ErrorBoundary`
  (`src/components/ErrorBoundary.tsx`). Never render raw objects (route error
  `data` may be non-string).
- Navigation: `<Redirect to="…" />` (`src/components/Redirect.tsx`); it is
  hash-router aware.
- Auth gating lives in the layouts: `/login` redirects when authenticated
  (`src/pages/Login/page.tsx`), and the authenticated layout redirects to
  `/login` when the auth signal is `null`
  (`src/layouts/authenticated/index.tsx`).

---

## 5. Type and icon sizing

There is **one** type scale, and it is stock Tailwind. The app used to carry four
custom tokens (`text-big`, `text-normal`, `text-small`, `text-tiny`) re-resolved
per app size through a `small:` variant. Both the tokens and the variant are gone,
along with the size setting and the `.small` body class. Do not reintroduce them.

| role              | class       | size  | line-height     |
|-------------------|-------------|-------|-----------------|
| change / hero     | `text-6xl`  | 60px  | 1 (0.8 in cart) |
| page / loud money | `text-5xl`  | 48px  | 1               |
| section title     | `text-2xl`  | 24px  | 32px            |
| body (default)    | `text-base` | 16px  | 24px            |
| secondary         | `text-sm`   | 14px  | 20px            |
| detail / meta     | `text-xs`   | 12px  | 16px            |

`src/lib/design-tokens.test.ts` enforces the allowlist, so an off-scale
`text-xl` fails the suite.

Two things make this easy to get wrong:

- `@layer base` force-applies `text-base` to
  `p, textarea, button, a, label, select, input, span`, so a `<span>`/`<p>` with
  no size class renders at `text-base` — not inherited.
- Tailwind preflight zeroes `h1..h6` (`font-size: inherit`), so an `<h2>` with no
  size class renders at the body size. Always give a heading a class that says
  how it outranks the body copy.

### Icons

Lucide icons take a size **class**, never a numeric `size={N}` attribute — the
attribute writes `width`/`height` attributes that no class can override, so it
silently escapes the scale. The house default is `size-[30px]`; a deliberately
different glyph uses `size-N` / `size-[Npx]`.

```tsx
<Settings className="size-[30px] text-muted-foreground" />
```

## 6. Effect essentials

- Prefer `Effect.gen(function* () { … })` over long `pipe` chains.
- Map errors with `Effect.mapError` / `Effect.catchTag`; keep a single service
  error type (`XError`) at the boundary.
- Store/bridge plugins are async — that's why domain services hydrate lazily and
  seed synchronously.
- `TaggedError` construction: `new XError({ message })`. (Effect also accepts
  `new XError(new Error(…))` since `Error` is structurally `{ message }`.)

---

## Migration checklist (old → new)

When moving a page off the legacy model:

1. Replace `db.*` / `store.*` calls with `service.*`.
2. Replace `use-data.ts` + `Result.use` + `revalidate()` with a service read via
   `useStream`; mutations write the service ref, so **drop `revalidate()`**.
3. Replace `Loader-old` (`createLoader` / `Consumer`) with
   `useStream` + `Loader` / `LoaderMany`.
4. Add typed boundaries with `createErrorBoundary` / `createManyErrorBoundary`.
5. Replace `size={N}` icon attributes with a `size-*` class.
6. Keep interface files comment-free; put implementation notes in `live.ts`.
7. Once a page reads from services, replace its top-level `Loader` with
   `createPageData` + per-widget `Gate`s so only the widgets that need data wait.

(Note: not all pages are migrated yet — `~/store`, `~/server`, `~/middleware`,
and `Loader-old` have been removed, and remaining consumers are being converted
to this model.)
