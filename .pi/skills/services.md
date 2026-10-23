---
name: services
description: Best practices and patterns for the Kassir service layer and React data flow — Effect services (Context.Tag + Layer + SubscriptionRef), the app-level `service` object, useStream/useMutation, Loader/LoaderMany, createErrorBoundary/createManyErrorBoundary, and Tailwind `small:` sizing. Use whenever adding or modifying a service, writing a component that reads service data, wiring layers, or migrating old `db`/`store`/`use-data`/`Loader-old` code.
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
  useStream(service.config.size.changes, () => Effect.runSync(service.config.size.get()));
  ```

### `useMutation(run)`

Runs an Effect on demand (event handlers, submits). Returns
`{ pending, error, data, mutate }`; `mutate(input)` resolves with an
`Either<A, E>`.

```tsx
const { pending, mutate } = useMutation(service.config.size.set);
<button disabled={pending} onClick={() => void mutate("small")}>Kecil</button>
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

### Page-level data — `src/components/page-data/`

The `Loader`/`LoaderMany` model gates a **page**: one result at the top and the
whole tree below it goes blank. `createPageData` gates a **widget**: the page
owns every subscription, each part reads only the keys it needs, and everything
else paints on the first frame.

```ts
// pages/Product/data.ts — the page's data contract, declared once
export const pageData = createPageData<{
  products: Product[];   // live   (service.product.get.changes)
  printers: string[];    // once   (getPrinters(), a plain Effect)
}, ProductError | InvokeError>("ProductPage");
```

```tsx
// pages/Product/page.tsx — the page owns the sources
export default function Page() {
  return (
    <pageData.Provider sources={{
      products: service.product.get.changes,   // Stream = live
      printers: getPrinters(),                 // Effect = read once
    }}>
      <Toolbar />   {/* static chrome: interactive immediately */}
      <Grid />      {/* gated on products */}
      <Fab />       {/* static chrome */}
    </pageData.Provider>
  );
}

// z-Toolbar.tsx — a leaf reads its own slice; no prop drilling
const res = pageData.use("products");
return (
  <Gate res={res} skeleton={<ToolbarSkeleton />}>
    {({ data }) => <Bars items={data} />}
  </Gate>
);

// z-Grid.tsx — needs two keys: waits for the *last* one
const res = pageData.useAll("products", "printers");
```

Rules:

- **Every key subscribes once, in parallel**, when the provider mounts — never a
  waterfall. `Stream` sources stay live; `Effect` sources run once and re-run on
  `pageData.useRefresh()(key)`.
- **Gate the widget, not the page.** Card frames, headers, toolbars, pagination
  and action buttons belong outside any `Gate`.
- **Pulse values, not cards.** When a card's structure is static and only its
  numbers are async, do not swap the card for a skeleton — render the frame and
  put `<SkeletonText className="w-32" />` where each value goes, at the width it
  will occupy. Nothing moves when the value lands, the wording around it is
  readable immediately, and two related values can arrive separately. Reserve
  `Gate` for a region whose *body* is the thing that loads (a list, a table).
  `pages/Home/z-Stats.tsx` is the worked example; `SkeletonText` lives beside
  `Skeleton` in `~/components/ui/skeleton.tsx`.
- **Give a gated body a floor.** A list body shorter than its skeleton collapses
  the card the moment the rows arrive. Put one `min-h` on the rows container and
  draw the skeleton rows at that exact height (real row height, big and `small:`
  both), so the swap is invisible: `pages/Home/z-Ledger.tsx` (`ROWS_FLOOR`).
- **A `Gate` keeps the anti-flash delay (200 ms).** A local read answers in a few
  milliseconds, and a placeholder that flickers for two frames reads as jank.
  The delay is only harmless when the region's *space* is already reserved — that
  is what the floor above is for: the card holds its height, and the skeleton
  fades in only for a read that is genuinely slow. Pass `delay={0}` where nothing
  reserves the space (`pages/Home` uses it nowhere; the demo's widgets do not
  either).
- **Params go in `deps`.** `<pageData.Provider sources={…} deps={[dayStart, id]}>`
  re-subscribes every key when one changes, keeping the old answers on screen
  with `refetching` instead of blanking them.
- `useAll` is `success` only when every key it reads is ready (errors surface
  immediately) — it never renders a half-filled card.
- **A failure stays inline.** `Gate` renders `role="alert"` with an optional
  retry; the page-level boundary remains the last resort. Pass `error` to replace
  the default slot: `<Gate error={(e) => <MyError error={e} />}>`.
- `refresh` keeps the previous value and flags it `refetching` (same vocabulary
  as `useQuery`'s `keepPrevious`) instead of flashing a skeleton.
- `useSnapshot()` exposes the whole page state for a status strip or a debug
  panel; `pageData.use(key).type` is enough for a single chip.
- The playground lives at `/dev/page-data` (DEV only) — see
  `src/pages/Dev/PageData/`, and `e2e/page-data.e2e.ts` for the arrival order.

#### Writes — `useMutation`

A mutation names the keys it invalidates. From the moment it starts, those keys
keep their value and carry `refetching: true`; on success a read-once (`Effect`)
key is re-run and the flag clears with the new value, while a live (`Stream`) key
just clears — the service already pushed what changed.

```ts
const save = pageData.useMutation(service.product.set.name, {
  refetch: ["products"],      // invalidated keys, typed
});
await save.mutate({ id, name });   // -> Either<A, E>, like Loader's useMutation
// save.pending    this write's own round-trip (buttons)
// save.refetching true through the write *and* the refetch that follows
```

**The pattern does not prescribe the look.** `res.refetching` (or the `refetching`
argument of `Gate`'s render prop) is the only signal; each component decides:
dim + shimmer, a spinner, a "menyegarkan" chip, a progress bar, or nothing. A
non-stale widget must never go busy for a key it does not read.

```tsx
const res = pageData.use("products");
<Gate res={res} skeleton={<TableSkeleton />}>
  {({ data, refetching }) => (
    <div className={refetching ? "pointer-events-none opacity-40" : undefined}>
      <Table items={data} />
    </div>
  )}
</Gate>
```

`useMutation` returns `pending | error | data | refetching`; failures clear the
flag without re-running anything and come back as `Left`, so the caller decides
between a toast, a field error, or the inline error slot. Styles for a stale
look are page-local — `src/pages/Dev/PageData/z-Stale.tsx` is one example
(`animate-shimmer`, defined in `global.css`, is the shared sweep).

---

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

## 5. Styling that depends on the app size

Do **not** use `useSize()` for icon/size styling. The app toggles `.small` on
`<body>`, and `src/global.css` defines `@custom-variant small (&:is(.small *))`.
Use the Tailwind variant — it also overrides `lucide-react`'s `width/height`
attributes:

```tsx
<Settings className="size-6 small:size-5" />
<div className="h-[52px] small:h-[44px]" />
```

Reserve `useSize()` for logic that needs the actual value (e.g. the size select
in `Setting/Shop/z-SelectSize.tsx`).

### Text scale

`src/global.css` defines four size tokens, re-resolved per app size:

| token | class | `big` (default) | `small` |
|---|---|---|---|
| `--text-big` | `text-big` | 48px / 48 | 36px / 40 |
| `--text-normal` | `text-normal` | 30px / 36 | 20px / 28 |
| `--text-small` | `text-small` | 24px / 32 | 18px / 28 |
| `--text-tiny` | `text-tiny` | 14px / 20 | 12px / 16 |

Two things make this easy to get wrong:

- `@layer base` force-applies `text-normal` to
  `p, textarea, button, a, label, select, input, span`, so a `<span>`/`<p>` with
  no size class renders at `text-normal` — not inherited.
- Tailwind preflight zeroes `h1..h6` (`font-size: inherit`), so an `<h2>` with no
  size class renders at **16px**, *smaller* than surrounding body copy.

Rules:

- **Do not use `text-tiny`.** It is reserved as a manual escape hatch for the
  project owner. `text-small` is the smallest size an agent may apply.
- **Never use raw `text-xs` / `text-sm` / `text-[Npx]`.** They are fixed px and
  ignore the app size mode entirely, so they break under the `small:` toggle.
  Always pick from the four tokens above and let `small:` do the scaling.

---

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
5. Replace `size`-driven icon styles with the `small:` variant.
6. Keep interface files comment-free; put implementation notes in `live.ts`.
7. Once a page reads from services, replace its top-level `Loader` with
   `createPageData` + per-widget `Gate`s so only the widgets that need data wait.

(Note: not all pages are migrated yet — `~/store`, `~/server`, `~/middleware`,
and `Loader-old` have been removed, and remaining consumers are being converted
to this model.)
