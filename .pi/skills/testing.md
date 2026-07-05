# Testing Best Practices

This project uses [Bun Test](https://bun.sh/docs/test/writing) with [Testing Library](https://testing-library.com/docs/react-testing-library/intro) for all React component and page tests.

---

## Table of Contents

1. [Setup & Tooling](#setup--tooling)
2. [Two-Tier Testing Strategy](#two-tier-testing-strategy)
3. [Analyze Before You Write](#analyze-before-you-write)
4. [Shared Mock Module](#shared-mock-module)
5. [Stateful Mocks](#stateful-mocks)
6. [Page-Level Tests](#page-level-tests)
7. [z-* Component Tests](#z--component-tests)
8. [Mock Services](#mock-services)
9. [StateWrap Testing](#statewrap-testing)
10. [WithLoader Testing](#withloader-testing)
11. [Accessibility Testing](#accessibility-testing)
12. [Form Validation Testing](#form-validation-testing)
13. [Radix Select Testing](#radix-select-testing)
14. [User Interaction](#user-interaction)
15. [Dialog Testing](#dialog-testing)
16. [Query Patterns](#query-patterns)
17. [Test the UI, Not the Implementation](#test-the-ui-not-the-implementation)
18. [Avoid jest-dom Matchers](#avoid-jest-dom-matchers)
19. [Anti-Patterns](#anti-patterns)
20. [Test File Structure](#test-file-structure)
21. [Checklist](#checklist)

---

## Setup & Tooling

| Tool | Role |
|---|---|
| `bun:test` | Test runner, assertions (`describe`, `test`, `expect`, `mock`) |
| `@testing-library/react` | DOM queries (`screen`, `waitFor`, `within`) |
| `@testing-library/user-event` | Simulate real user interactions (`user.click`, `user.type`, `user.keyboard`) |
| `~/lib/render` | Custom render wrapping tested component in `MemoryRouter` for React Router context |

```tsx
// src/lib/render.tsx
import { render as renderRaw } from "@testing-library/react";
import { MemoryRouter } from "react-router";

export function render(ui: React.ReactElement) {
  return renderRaw(ui, { wrapper: MemoryRouter });
}
```

**Always import `render` from `~/lib/render`** — never from `@testing-library/react` directly. Components using `<Link>`, `useNavigate`, or any React Router hook need `MemoryRouter` context.

---

## Two-Tier Testing Strategy

Tests are split by the architecture boundary:

```
Page-level tests (page.test.tsx)
  ├── Service injection via Effect.provideService
  ├── Effect-runSync resolution
  ├── StateWrap states (loading / error / success)
  └── Integration: page → z-* children

z-* component tests (z-*.test.tsx)
  ├── Pure React — render with props directly
  ├── Callback invocation (onAdd, onDelete, onUpdate)
  ├── User interactions
  └── No Effect, no service injection
```

**Rule:** If it requires `yield* Service`, it goes in `page.test.tsx`. If it renders a `z-*` component with props, it goes in `z-*.test.tsx`.

---

## Analyze Before You Write

**Before writing a single test**, read the component source and enumerate every interaction branch as a todo list. Only write tests after you've exhaustively mapped the decision tree.

### Process

1. **Read the component** — props, local state, conditional rendering, callbacks, edge cases
2. **List every branch** — each `if`, ternary, `&&`, `switch`, callback variant (success/error), loading state, disabled state
3. **Write the list as comments** inside the test file before any `test()` block
4. **Tick them off** as you write each corresponding test

### Example: CashierItem

Read `z-Item.tsx` and enumerate every interaction:

```tsx
// === Interaction branches ===
//
// [ ] Self item — renders name as <p> text, not an <input>
// [ ] Self item — role select is disabled
// [ ] Self item — delete button is hidden
//
// [ ] Other item — renders name as <input> with defaultValue={cashier.name}
// [ ] Other item — role select is enabled
// [ ] Other item — delete button is visible
//
// [ ] Name input — submit with empty value → shows Zod validation error ("Harus ada")
// [ ] Name input — submit with new value → calls onUpdateName(id, name)
// [ ] Name input — onUpdateName returns error → shows error text
// [ ] Name input — onUpdateName returns null → no error, store mutated
//
// [ ] Role select — click opens popover
// [ ] Role select — select "Admin" → calls onUpdateRole(id, "admin")
// [ ] Role select — select "User" → calls onUpdateRole(id, "user")
// [ ] Role select — onUpdateRole returns error → shows error text
// [ ] Role select — onUpdateRole returns null → select value updates (stateful re-render)
//
// [ ] Delete button — click opens confirmation dialog
// [ ] Delete dialog — shows cashier name and "Yakin?" heading
// [ ] Delete dialog — click "Hapus" → calls onDelete(id)
// [ ] Delete dialog — onDelete returns null → dialog closes
// [ ] Delete dialog — click "Batal" → dialog closes
// [ ] Delete dialog — press Escape → dialog closes (accessibility)
//
// [ ] Accessibility — self item select is disabled
// [ ] Accessibility — self item has no delete button
//
// [ ] Stateful round-trip — delete removes item from the list (when using StatefullCashiers)
// [ ] Stateful round-trip — role change updates select display (when using StatefullCashiers)
// [ ] Stateful round-trip — name change mutates store (when using StatefullCashiers)
```

```tsx
// z-CashierList branches
//
// [ ] Renders all cashier items from useCashiers()
// [ ] Empty list — renders container with zero children
// [ ] Passes correct currentUserName to each CashierItem
//
// NewCashier branches
//
// [ ] Trigger button renders with "Tambah Kasir"
// [ ] Click trigger → dialog opens with heading "Tambah Kasir"
// [ ] Dialog contains name textbox
// [ ] Submit with empty name → validation blocks, dialog stays open
// [ ] Submit with name → calls onAdd(name)
// [ ] onAdd returns error → shows error text
// [ ] onAdd returns null → error cleared (success)
// [ ] Click "Batal" → dialog closes
// [ ] Subsequent success clears previous error
```

### Golden rule

> If you haven't listed **all** the branches as a todo first, you haven't thought hard enough about what to test. Writing tests without the list leads to gaps — silent paths that break silently.

### 🚨 Only test what the user can actually do

**Never test internal state mutations that are unreachable by the user.** Before writing a test, verify: is there a button, form, or interaction on the actual page that triggers this path? If not — skip it.

```tsx
// ❌ User can't delete pockets from the Money page — no delete button exists
state.delete("1");
await waitFor(() => expect(screen.queryByText("Penjualan")).toBeNull());

// ✅ User CAN add pockets via the "Kantong Baru" button
await user.click(screen.getByRole("button", { name: /kantong baru/i }));
// ... fill form, submit, assert new item appears
```

This also means: don't test library internals (field-error slots, form subscription states), don't test implementation details (what callback was called with), and don't test paths that only exist in your mock but not in the real component.

Resist the urge to start writing `test()` immediately. The list IS the thinking. The tests are just the execution.

---

## Shared Mock Module

When multiple test files share the same mock infrastructure (stateful stores, service factories), extract them into a **`__test/mock.ts`** file. This keeps tests focused on assertions while the mock logic lives in one place.

### What goes in `mock.ts`

```
__test/
├── mock.ts               ← shared mock infrastructure
├── page.test.tsx          ← imports from ./mock
├── z-List.test.tsx        ← imports from ./mock
└── z-NewItem.test.tsx     ← may use mock if needed
```

**In `mock.ts`:**
- `TestX` interfaces and default fixture data
- Stateful store classes (`StatefullX`) with `useSyncExternalStore` hooks
- Service factory functions (`makeXService`) wired to stateful stores

**Exported for tests:**
- `StatefullCashiers` / `StatefullUser` — create instances for tests that need shared state
- `makeCashierService` / `makeUserService` — inject into `Effect.provideService`
- `defaultCashiers` / `defaultUser` — default fixtures

### Example: mock.ts

```tsx
// __test/mock.ts
import { useSyncExternalStore } from "react";
import { Effect } from "effect";
import { CashierService, CashierError } from "~/services/cashier";
import type { Cashier } from "~/services/cashier";
import type { Listener } from "~/lib/state";

export interface TestCashier {
  name: string;
  role: DBNamespace.Role;
  id: string;
}

export const defaultCashiers: TestCashier[] = [
  { name: "Budi", role: "admin", id: "1" },
  { name: "Ani", role: "user", id: "2" },
  { name: "Citra", role: "user", id: "3" },
];

export const defaultUser: TestCashier = { name: "Budi", role: "admin", id: "1" };

export class StatefullCashiers {
  cashiers: TestCashier[];
  listeners = new Set<Listener>();

  constructor(cashiers?: TestCashier[]) {
    this.cashiers = cashiers ?? [...defaultCashiers];
  }

  getSnapshot(): TestCashier[] { return this.cashiers; }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  notify() { this.listeners.forEach((l) => l()); }

  useCashiers(): Cashier[] {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }

  add(c: TestCashier)  { this.cashiers = [...this.cashiers, c]; this.notify(); }
  delete(id: string)   { this.cashiers = this.cashiers.filter(c => c.id !== id); this.notify(); }
  setName(id: string, name: string) {
    this.cashiers = this.cashiers.map(c => c.id === id ? { ...c, name } : c);
    this.notify();
  }
  setRole(id: string, role: DBNamespace.Role) {
    this.cashiers = this.cashiers.map(c => c.id === id ? { ...c, role } : c);
    this.notify();
  }
}
```

---

## Stateful Mocks

Stateful mocks use `useSyncExternalStore` to make the mock store **reactive**. When a service callback mutates the store, components that call `useCashiers()` / `useUser()` automatically re-render with new data. This enables **full round-trip integration tests**: user interacts → service mutates → component re-renders → DOM updates.

### When to use

**✅ Stateful mock:** The component receives a **hook prop** (`useCashiers: () => Cashier[]`) that calls `useSyncExternalStore` internally. A plain `() => [...]` mock passes the initial render but can't verify re-render after interaction.

**❌ Plain mock is enough:** The component receives a **plain value prop** (`cashiers: Cashier[]`) or a **simple callback** (`onDelete: (id) => Promise<string | null>`). No reactive hook involved — a plain mock suffices.

### When NOT to use

**Skip stateful mocks when the page is read-only** — no mutations happen while the user is on the page:

- Data arrives via `<WithLoader loader={get.all}>` which calls the children with a plain value: `{(data) => <Component items={data} />}`
- Components receive **plain props**, not hooks
- Actions like `login()`, `onAdd()` are terminal — they navigate away, not mutate in-place state
- There's no `useSyncExternalStore` anywhere in the component tree

**Example — Login page:**

```tsx
// ❌ Don't create a StatefullLogin — nothing to observe reactively
// ✅ Plain mock factories are sufficient

function makeCashierService(opts?: { cashiers?: Cashier[]; allError?: CashierError }) {
  return {
    get: {
      all: () => opts?.allError
        ? Effect.fail(opts.allError)
        : Effect.succeed(opts?.cashiers ?? []),
    },
    add: () => Effect.succeed({ ... }),    // plain mock
    // ...
  };
}
```

**Decision flowchart:**

```
Does the component receive a use* hook prop? ──No──▶ Plain mock
         │
        Yes
         │
Does a user interaction mutate state that the
component must re-render to reflect? ──No──▶ Plain mock
         │
        Yes
         │
      Stateful mock (class + useSyncExternalStore)
```

### Pattern: Class + Service Factory

The factory accepts an optional `state` instance so tests can share state, and optional error flags to simulate service-layer failures.

```tsx
export function makeCashierService(opts?: {
  loader?: () => Effect.Effect<void, CashierError>;
  state?: StatefullCashiers;
  addError?: string;       // if set, add() fails with this message
  deleteError?: string;    // if set, delete() fails with this message
  setNameError?: string;
  setRoleError?: string;
}): typeof CashierService.Service {
  const state = opts?.state ?? new StatefullCashiers();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useCashiers: () => state.useCashiers(),
    add: (input) => {
      if (opts?.addError) {
        return Effect.fail(new CashierError(new Error(opts.addError)));
      }
      const newCashier = { name: input.name, id: randomId(), role: input.role ?? "user" };
      state.add(newCashier);
      return Effect.succeed(newCashier);
    },
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new CashierError(new Error(opts.deleteError)));
      }
      state.delete(id);
      return Effect.void;
    },
    // ... set.name, set.role similarly
  };
}
```

### Using in page tests

```tsx
import { StatefullCashiers, makeCashierService } from "./mock";

test("deleting a cashier removes it from the list", async () => {
  const user = userEvent.setup();
  const state = new StatefullCashiers();  // shared state instance
  const Page = Effect.runSync(
    page.pipe(
      Effect.provideService(CashierService, makeCashierService({ state })),
      Effect.provideService(UserService, makeUserService()),
    ),
  );
  render(<Page />);

  // ... click delete, confirm, assert item is gone ...
});
```

### Using in z-* component tests

Pass the stateful store's hook as `useCashiers` and wire callbacks to mutate the store by default:

```tsx
function renderList(opts?: {
  state?: StatefullCashiers;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  const state = opts?.state ?? new StatefullCashiers();
  return render(
    <CashierList
      useCashiers={() => state.useCashiers()}
      // Default: mutate store + return null (success)
      onDelete={opts?.onDelete ?? ((id) => { state.delete(id); return Promise.resolve(null); })}
    />,
  );
}
```

### 🚨 Don't mutate the store in error callbacks

When testing error paths, the callback should return an error string **without** mutating the store:

```tsx
// ❌ Mutates then returns error — item disappears before error is shown
onDelete: async (id) => { state.delete(id); return "Gagal"; }

// ✅ Error-only — no mutation, item stays in the list
onDelete: async () => "Gagal"
```

---

## Page-Level Tests

### Structure

```tsx
// src/pages/Example/__test/page.test.tsx
import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { ExampleService, ExampleError } from "~/services/example";
import page from "../page";
import { render } from "~/lib/render";

// 1. Mock data
const mockItems: Item[] = [
  { id: "1", name: "Foo" },
  { id: "2", name: "Bar" },
];

// 2. Mock service factory — plain object matching interface
function makeExampleService(opts?: {
  loader?: () => Effect.Effect<void, ExampleError>;
  items?: Item[];
}): typeof ExampleService.Service {
  const items = opts?.items ?? mockItems;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useItems: () => items,
    add: () => Effect.void,
    delete: () => Effect.void,
  };
}

// 3. Test: Effect resolves
describe("page (Effect)", () => {
  test("resolves when service is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(ExampleService, makeExampleService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// 4. Test: rendered output
describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makeExampleService>[0]) {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(ExampleService, makeExampleService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /example/i })).toBeInTheDocument();
  });
});
```

### Key points

- **`Effect.runSync(page)`** resolves the `Effect.gen` and returns the React component
- **`Effect.provideService`** injects the mock at test time; for multiple services use `Layer.mergeAll`
- **Two describe blocks**: one for Effect resolution (no DOM), one for component rendering
- **`renderPage` helper** accepts optional overrides for the mock factory

---

## z-* Component Tests

Pure React components receive everything via props. No Effect, no service injection. Use stateful mocks from `./mock` for reactive hook props.

### Structure

```tsx
// src/pages/Example/__test/z-List.test.tsx
import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List } from "../z-List";
import { render } from "~/lib/render";
import { StatefullItems } from "./mock";

function renderList(opts?: {
  state?: StatefullItems;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  const state = opts?.state ?? new StatefullItems();
  return render(
    <List
      useItems={() => state.useItems()}
      onDelete={
        opts?.onDelete ??
        ((id) => {
          state.delete(id);
          return Promise.resolve(null);
        })
      }
    />,
  );
}

describe("List", () => {
  test("renders all items", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText("Foo")).not.toBeNull();
      expect(screen.getByText("Bar")).not.toBeNull();
    });
  });

  test("deleting an item removes it from the list", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByText("Bar"));
    // ... click delete, confirm, assert item is gone ...
  });

  test("shows error when delete fails", async () => {
    const user = userEvent.setup();
    // Error callback — does NOT mutate store
    renderList({ onDelete: async () => "Gagal menghapus" });

    // ... assert error text appears ...
  });
});
```

### Key points

- **Import stateful mocks from `./mock`** — `StatefullCashiers`, `StatefullUser`
- **Default callbacks mutate store + return `null`** — enables round-trip tests
- **Override callbacks for error paths** — return error string without mutating
- **No `Effect.gen`, no `yield*`, no `Layer`** — just JSX with props
- **Use `within()` to scope queries** to a specific row/form within a list

---

## Mock Services

Mock services are **plain objects** matching the `Service.Service` type. Use `Layer.succeed` to wrap them.

### Single service

```tsx
const layer = Layer.succeed(ExampleService, makeExampleService());
const Page = Effect.runSync(Effect.provide(page, layer));
```

Or inline with `effect.pipe(Effect.provideService(...))`:

```tsx
const Page = Effect.runSync(
  page.pipe(Effect.provideService(ExampleService, makeExampleService())),
);
```

### Multiple services

```tsx
const layer = Layer.mergeAll(
  Layer.succeed(CashierService, makeCashierService()),
  Layer.succeed(UserService, makeUserService()),
);
const Page = Effect.runSync(Effect.provide(page, layer));
```

### Mock factory pattern

Always accept optional overrides so individual tests can customize behavior:

```tsx
function makeExampleService(opts?: {
  loader?: () => Effect.Effect<void, ExampleError>;
  items?: Item[];
}): typeof ExampleService.Service {
  const items = opts?.items ?? mockItems;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useItems: () => items,
    add: () => Effect.void,
    delete: () => Effect.void,
  };
}
```

- **Default: success** — callbacks return `Effect.void`, loader resolves immediately
- **Override for errors** — pass a custom loader/callback that returns `Effect.fail(error)`
- **Override for delay** — pass a pending Promise to test loading state
- **For reactive state (useSyncExternalStore)** — use stateful mocks (see [Stateful Mocks](#stateful-mocks))

---

## StateWrap Testing

Every page wraps its content in `<StateWrap loader={...}>`. Tests must cover all three states.

### Loading state

Use `Promise.withResolvers()` to create a Promise that never resolves (until we say so):

```tsx
test("shows loading skeleton while loader is pending", async () => {
  const deferred = Promise.withResolvers<void>();
  renderPage({ loader: () => Effect.promise(() => deferred.promise) });

  const skeletons = document.querySelectorAll("[data-slot='skeleton']");
  expect(skeletons.length).toBeGreaterThan(0);

  // Resolve and flush to avoid act warnings during cleanup
  deferred.resolve();
  await waitFor(() => {
    expect(screen.queryByText(/expected heading/i)).toBeInTheDocument();
  });
});
```

- **Assert on loading** before resolving the promise
- **Always resolve the deferred** and **await a `waitFor`** to flush the state update — otherwise the pending microtask causes an `act(...)` warning during cleanup

### Error state

```tsx
test("shows error message when loader fails", async () => {
  renderPage({
    loader: () => Effect.fail(new ExampleError(new Error("Gagal memuat data"))),
  });
  expect(await screen.findByText(/Gagal memuat data/i)).toBeInTheDocument();
});
```

- Loader returns `Promise.resolve(error)` (not `Promise.reject`)
- Use `screen.findByText` to wait for the error to appear

### Success state

Wrap assertions in `waitFor` or use `screen.findBy*`:

```tsx
describe("when loaded successfully", () => {
  test("renders list items", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Foo")).toBeInTheDocument();
    });
  });
});
```

---

## WithLoader Testing

`WithLoader` components (`BaseFinancialCard`, `TotalTransactionsCard`) use `Effect.runPromise` internally, similar to `StateWrap`. The same patterns apply:

### Loading state

```tsx
test("shows loading skeleton initially", () => {
  renderCard({ loader: () => Effect.never });
  const skeletons = document.querySelectorAll("[data-slot='skeleton']");
  expect(skeletons.length).toBeGreaterThan(0);
});
```

Use `Effect.never` to keep the loader permanently pending — no cleanup flush needed since it never resolves.

### Success / Error state

```tsx
test("renders value on success", async () => {
  renderCard({ loader: () => Effect.succeed({ todayValue: 150000, ... }) });
  await waitFor(() => {
    expect(screen.getByText("Rp 150000")).toBeInTheDocument();
  });
});

test("shows error when loader fails", async () => {
  renderCard({ loader: () => Effect.fail(new DailySummaryError(new Error("fail"))) });
  await waitFor(() => {
    expect(screen.getByText("fail")).toBeInTheDocument();
  });
});
```

### 🚨 Always `await` when the component tree contains WithLoader or StateWrap

Even if the assertion target is synchronous (e.g., a `<Header>` that receives props), the presence of `WithLoader` / `StateWrap` siblings in the same render tree fires async state updates. Without `await` (via `findBy*` or `waitFor`), those updates leak past test completion and produce `act(...)` warnings.

```tsx
// ❌ No await — WithLoader state updates leak
test("renders date", async () => {
  renderPage();
  expect(screen.getByText(today)).toBeInTheDocument();   // getBy*, no await
});

// ✅ Uses await — flushes WithLoader microtasks
test("renders date", async () => {
  renderPage();
  expect(await screen.findByText(today)).toBeInTheDocument();  // findBy*, await
});
```

**Rule:** When the component tree under test contains **any** `StateWrap` or `WithLoader`, every assertion must use `await` (either `findBy*` or `waitFor`).

---

## Accessibility Testing

### Dialog Escape key

Radix `Dialog` closes on `Escape` by default. Always test this:

```tsx
test("pressing Escape closes the dialog", async () => {
  const user = userEvent.setup();
  renderComponent();

  await user.click(await screen.findByRole("button", { name: /tambah/i }));
  expect(await screen.findByRole("dialog")).not.toBeNull();

  await user.keyboard("{Escape}");

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

### Disabled states

Test that self-referential items or unavailable actions are disabled/hidden:

```tsx
// Self-item select should be disabled
test("self item has disabled role select", async () => {
  renderList();
  await waitFor(() => screen.getByText("Budi"));
  const budiForm = screen.getByText("Budi").closest("form")!;
  const combobox = within(budiForm).getByRole("combobox");
  expect((combobox as HTMLButtonElement).disabled).toBe(true);
});

// Self-item delete button should not exist
test("self item has no delete button", async () => {
  renderList();
  await waitFor(() => screen.getByText("Budi"));
  const budiForm = screen.getByText("Budi").closest("form")!;
  expect(within(budiForm).queryByRole("button")).toBeNull();
});
```

---

## Form Validation Testing

### Zod validation with uncontrolled inputs

When a component uses `<Input defaultValue={...} name="name" />` with Zod validation, test the validation branch before the callback is ever called:

```tsx
test("shows validation error when name is empty on submit", async () => {
  const user = userEvent.setup();
  renderList();

  await waitFor(() => screen.getByDisplayValue("Ani"));
  const input = screen.getByDisplayValue("Ani");

  // Clear and submit with empty value
  await user.clear(input);
  await user.keyboard("{Enter}");

  // Validation fires BEFORE the callback — Zod nonempty message appears
  expect(await screen.findByText(/Harus ada/i)).not.toBeNull();
});
```

**Key:** The `new FormData(e.currentTarget)` reads the form value at submit time. `z.string().nonempty()` validates before the async callback. The validation error never reaches the service layer.

**For the prettified error message:** Use `parsed.error.issues[0]?.message ?? "Harus diisi"` instead of `parsed.error.message` (which dumps a JSON blob).

---

## Radix Select Testing

`@radix-ui/react-select` relies on `PointerEvent` which neither `happy-dom` (bun test) nor `jsdom` (vitest) implement. Tests also need `scrollIntoView`, `releasePointerCapture`, and `hasPointerCapture` on `HTMLElement`.

### Setup (one-time)

In `test/happydom.ts` (bun test) or `test/setup.ts` (vitest):

```tsx
// Mock PointerEvent only if the DOM environment lacks it
// (happy-dom's GlobalRegistrator may already provide one — don't override it)
if (!window.PointerEvent) {
  class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    pointerType: string;

    constructor(type: string, props: PointerEventInit) {
      super(type, props);
      this.button = props.button || 0;
      this.ctrlKey = props.ctrlKey || false;
      this.pointerType = props.pointerType || "mouse";
    }
  }
  window.PointerEvent = MockPointerEvent as typeof PointerEvent;
}

// Polyfill missing DOM methods — don't clobber existing implementations
window.HTMLElement.prototype.scrollIntoView =
  window.HTMLElement.prototype.scrollIntoView || (() => {});
window.HTMLElement.prototype.releasePointerCapture =
  window.HTMLElement.prototype.releasePointerCapture || (() => {});
window.HTMLElement.prototype.hasPointerCapture =
  window.HTMLElement.prototype.hasPointerCapture || (() => false);
```

### Select + submit test

```tsx
test("selecting user and submitting updates the UI", async () => {
  const user = userEvent.setup();
  renderForm();

  // 1. Open the select popover
  await user.click(screen.getByRole("combobox"));

  // 2. Click the option
  await user.click(await screen.findByRole("option", { name: "Budi" }));

  // 3. Type remaining fields
  await user.type(screen.getByLabelText("Kata sandi"), "secret123");

  // 4. Submit — the button may appear disabled due to @tanstack/react-form lag
  //    Use fireEvent.submit on the form directly (exception to userEvent rule)
  fireEvent.submit(document.querySelector("form")!);

  // 5. Assert the UI outcome, not callback arguments
  await waitFor(() => {
    expect(screen.getByText(/selamat datang/i)).not.toBeNull();
  });
});
```

### Stateful round-trip: select updates with re-render

When the select's `value` is bound to a reactive prop (`value={cashier.role}`), use stateful mocks to verify the full cycle:

```tsx
test("changing role updates the select value", async () => {
  const user = userEvent.setup();
  const state = new StatefullCashiers();
  renderList({ state });

  await waitFor(() => screen.getByDisplayValue("Ani"));

  // Scope to Ani's form row and find the role combobox
  const aniForm = screen.getByDisplayValue("Ani").closest("form")!;
  const roleTrigger = within(aniForm).getByRole("combobox");
  expect(roleTrigger.textContent).toContain("User");

  // Open the select and pick "Admin"
  await user.click(roleTrigger);
  await user.click(await screen.findByRole("option", { name: "Admin" }));

  // The trigger re-renders with the new role from the stateful store
  await waitFor(() => {
    expect(roleTrigger.textContent).toContain("Admin");
  });
});
```

### Key points

- **Click the combobox** (`role="combobox"`) to open the popover
- **Find the option** with `screen.findByRole("option", { name })` — works even in portaled content
- **Click the option** with `user.click()` — `PointerEvent` mock enables this
- **Submit with `fireEvent.submit(form)`** — the button's visual `disabled` state may be stale in test DOMs, but the form state is correct (verify via `document.querySelector('select[name="…"]').value`)

---

## User Interaction

### Always use `userEvent`

```tsx
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
await user.click(button);
await user.type(input, "text");
await user.clear(input);
await user.keyboard("{Enter}");
```

| Action | userEvent |
|---|---|
| Click a button | `await user.click(screen.getByRole("button", { name: /submit/i }))` |
| Type in an input | `await user.type(screen.getByRole("textbox"), "value")` |
| Clear an input | `await user.clear(screen.getByDisplayValue("old"))` |
| Press Enter | `await user.keyboard("{Enter}")` |
| Press Escape | `await user.keyboard("{Escape}")` |
| Select an option | `await user.click(trigger); await user.click(option)` |

### Never use raw DOM APIs

| ❌ Don't | ✅ Do |
|---|---|
| `fireEvent.click(button)` | `await user.click(button)` |
| `input.value = "x"` | `await user.type(input, "x")` |
| `form.requestSubmit()` | `await user.keyboard("{Enter}")` |
| `form.submit()` | `await user.click(submitButton)` |

**Why:** `userEvent` wraps every interaction in `act()` and mimics real browser behavior (focus, blur, keydown, keyup sequences). Raw DOM APIs skip `act()` and cause spurious warnings.

---

## Dialog Testing

### Opening a dialog

```tsx
test("opens dialog when trigger is clicked", async () => {
  const user = userEvent.setup();
  renderComponent();

  // 1. Find the trigger button
  const trigger = await screen.findByRole("button", { name: /tambah/i });
  // 2. Click it
  await user.click(trigger);
  // 3. Assert dialog is in the DOM
  expect(await screen.findByRole("dialog")).not.toBeNull();
});
```

### Assert dialog content

```tsx
// Heading, description, and specific content
await waitFor(() => {
  expect(screen.getByRole("heading", { name: /tambah/i })).not.toBeNull();
  expect(screen.getByText(/buat akun baru/i)).not.toBeNull();
});

// For delete confirmations — check the item name is shown
await waitFor(() => {
  expect(screen.getByText(/yakin\?/i)).not.toBeNull();
  expect(screen.getByText(/>Citra/i)).not.toBeNull();
});
```

### Submitting inside a dialog

```tsx
test("submitting form calls onAdd", async () => {
  const user = userEvent.setup();
  renderComponent({ onAdd: async (name) => null });

  // Open the dialog
  await user.click(await screen.findByRole("button", { name: /tambah/i }));
  // Fill the form
  await user.type(screen.getByRole("textbox"), "Dian");
  // Submit
  await user.click(screen.getByRole("button", { name: /tambahkan/i }));

  // Assert UI outcome (e.g., error cleared, new item appears)
  await waitFor(() => {
    expect(screen.queryByText(/gagal/i)).toBeNull();
  });
});
```

### Closing a dialog

```tsx
// Close with "Batal" button
await user.click(screen.getByRole("button", { name: /batal/i }));
await waitFor(() => {
  expect(screen.queryByRole("dialog")).toBeNull();
});

// Close with Escape key (accessibility)
await user.keyboard("{Escape}");
await waitFor(() => {
  expect(screen.queryByRole("dialog")).toBeNull();
});
```

**Use `queryByRole` for assertions about absence** — `getByRole` throws if not found, `queryByRole` returns `null`.

---

## Query Patterns

| Query | When to use | Behavior |
|---|---|---|
| `screen.findByRole(...)` | Element appears asynchronously | Waits, throws if not found |
| `screen.getByRole(...)` | Element is already in DOM | Throws immediately if not found |
| `screen.queryByRole(...)` | Asserting element is NOT present | Returns `null`, no throw |
| `screen.getByText(...)` | Text content assertion | Exact/substring match |
| `screen.getByDisplayValue(...)` | Input/textarea value assertion | Matches `value` attribute |
| `screen.getByPlaceholderText(...)` | Assert input by placeholder | Matches `placeholder` attribute |
| `await waitFor(() => { ... })` | Batch multiple async assertions | Retries until assertions pass |
| `within(element).getByRole(...)` | Scope query to a subtree | Searches only children of `element` |

### Prefer `findBy*` over `getBy*` + `waitFor`

```tsx
// ✅ Clean
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// ❌ Verbose (same result, more code)
await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});
```

Exception: use `waitFor` when asserting **multiple elements** from the same async source, to avoid interleaved `findBy*` calls.

### Use `within` for scoped queries

```tsx
const row = screen.getByDisplayValue("Citra").closest("form")!;
const deleteBtn = within(row).getAllByRole("button")[1];
```

---

## Test the UI, Not the Implementation

**Assert what the user sees**, not what callbacks were called with.

```tsx
// ❌ Tests implementation detail — callback argument
const onSet = mock((s: string) => {});
renderSelect({ onSetSize: onSet });
await user.click(option);
expect(onSet).toHaveBeenCalledWith("small");

// ✅ Tests observable UI — the trigger shows the new value
const state = new StatefullSize();
renderSelect({ useSize: () => state.useSize(), onSetSize: (s) => state.set(s) });
await user.click(option);
await waitFor(() => {
  expect(screen.getByRole("combobox", { name: "Ukuran" }).textContent).toContain("Kecil");
});
```

**Principle:** If a callback fires but the component doesn't update, the user sees nothing. A test that only checks the mock passes but is a false positive. Always assert on rendered DOM.

**Error states are the exception** — verifying that `"Gagal menyimpan"` appears in the DOM after a failed callback IS testing the UI. You don't need a separate test that the callback was invoked — the error text appearing proves it was.

```tsx
// ✅ Error text appearing proves the callback ran AND the component handled it
render(<ClearLog onClear={async () => "Gagal membersihkan"} />);
await user.click(screen.getByRole("button", { name: /bersihkan/i }));
expect(await screen.findByText("Gagal membersihkan")).not.toBeNull();
```

---

## Avoid jest-dom Matchers

`@testing-library/jest-dom` matchers like `toHaveTextContent`, `toBeChecked`, and `toBeInTheDocument` depend on Jest's internal `context.utils` API which **bun does not provide**. Using them causes `TypeError: context.utils.EXPECTED_COLOR is not a function`.

Replace them with plain assertions:

| jest-dom matcher | Plain replacement |
|---|---|
| `expect(el).toHaveTextContent("X")` | `expect(el.textContent).toContain("X")` |
| `expect(el).toBeInTheDocument()` | `expect(el).not.toBeNull()` |
| `expect(el).toBeChecked()` | `expect((el as HTMLInputElement).checked).toBe(true)` |
| `expect(el).toHaveValue(58)` | `expect((el as HTMLInputElement).value).toBe("58")` |

```tsx
// ❌ Breaks in bun — jest-dom matcher
await waitFor(() => {
  expect(screen.getByRole("combobox")).toHaveTextContent("Kecil");
});

// ✅ Works in any runner — plain assertion
await waitFor(() => {
  expect(screen.getByRole("combobox").textContent).toContain("Kecil");
});
```

**Note:** `toBeInTheDocument()` sometimes works in bun for simple cases, but fails inside `waitFor` after `useSyncExternalStore` re-renders. Prefer `.not.toBeNull()` everywhere for consistency.

---

## Anti-Patterns

### 🚨 Submitting forms via raw DOM APIs

```tsx
// ❌ Bypasses userEvent's act() wrapping — produces Field/LocalSubscribe act warnings
const form = input.closest("form")!;
form.requestSubmit();
form.submit();

// ✅ Goes through userEvent — properly wrapped in act()
await user.keyboard("{Enter}");
await user.click(screen.getByRole("button", { name: /submit/i }));
```

This is the #1 source of spurious `act(...)` warnings in `@tanstack/react-form` tests. Raw DOM form submission triggers `useSyncExternalStore` state updates that React's `act()` cannot capture. Always submit forms the way a real user would — pressing Enter or clicking a submit button.

---

- **Don't call raw DOM methods** — `form.requestSubmit()`, `form.submit()`, `fireEvent.*` — use `userEvent` which wraps in `act()`
- **Don't wrap `render()` in `act()`** — `render` from testing-library already does this
- **Don't use `getBy*` for elements that appear asynchronously** — use `findBy*` or `waitFor`
- **Don't assert negative with `getBy*`** — use `queryBy*` and `expect(...).not.toBeNull()`
- **Don't forget to flush deferred promises** — always resolve and `await waitFor` after testing loading state
- **Don't use `Promise.reject` for error mocks** — `StateWrap`'s `loader` is passed through `promisify`, which catches Effect failures
- **Don't pass raw `Promise.resolve(error)` as loader** — use `Effect.fail(error)` for error states
- **Don't import `render` from `@testing-library/react`** — use `~/lib/render` which includes `MemoryRouter`
- **Don't create `Layer.effect` for simple mocks** — `Layer.succeed` with a plain object is enough
- **Don't test `@tanstack/react-form` internals** — test that callbacks are/aren't called, not that specific validation error messages render
- **Don't use `@testing-library/jest-dom` matchers** — `toHaveTextContent`, `toBeChecked`, `toBeInTheDocument` break in bun. Use `element.textContent`, `element.checked`, `.not.toBeNull()` instead
- **Don't test mock callback invocation as the primary assertion** — test the resulting UI change. The error text appearing proves the callback was called
- **Don't use `getByRole("combobox")` on pages with multiple selects** — scope with `within()` to a specific row's form
- **Don't pass service objects to React land in tests either** — mock services return the same interface but are plain objects
- **Don't mutate the stateful store in error callbacks** — the item disappears before the error appears, unmounting the dialog. Return the error without mutating:
  ```tsx
  // ❌ Mutates store → item removed → dialog unmounts
  onDelete: async (id) => { state.delete(id); return "Gagal"; }
  // ✅ Error-only, store untouched
  onDelete: async () => "Gagal"
  ```

---

## Test File Structure

```
src/pages/Example/
├── page.tsx
├── index.tsx
├── z-List.tsx
├── z-NewItem.tsx
├── z-Loading.tsx
└── __test/
    ├── mock.ts               ← shared stateful mocks & factories
    ├── page.test.tsx          ← page-level: Effect + StateWrap
    ├── z-List.test.tsx        ← pure component: props → render → assert
    └── z-NewItem.test.tsx     ← pure component: props → render → assert
```

- One test file per source file
- Test file mirrors the source name: `z-Foo.tsx` → `z-Foo.test.tsx`
- `page.test.tsx` covers the `Effect.gen` resolution AND the rendered page with mocked services
- **`mock.ts`** contains all shared infrastructure: stateful store classes, service factory functions, default fixtures — imported by all test files

---

## Checklist

When adding tests for a page, verify:

### Branch analysis
- [ ] **All interaction branches enumerated** — write the TODO list before any `test()`
- [ ] Self-vs-other item cases covered (disabled states, hidden elements)
- [ ] Every callback variant: success, error, validation-before-callback
- [ ] Accessibility: Escape key for dialogs, disabled attributes

### page.test.tsx
- [ ] Effect resolution with all services provided
- [ ] Loading skeleton while loader is pending (`Effect.promise(() => deferred.promise)`)
- [ ] Error message when loader fails (`Effect.fail`)
- [ ] Heading, description, and key elements visible on success
- [ ] Stateful round-trip: **add** → new item appears in list
- [ ] Stateful round-trip: **delete** → item removed from list
- [ ] Stateful round-trip: **update** → changed value reflects in DOM (select, etc.)
- [ ] Service-layer errors: `addError`, `deleteError` options → error shown in UI

### z-*.test.tsx
- [ ] All items rendered with correct data
- [ ] Empty state renders container with no children
- [ ] Self item: name renders as text (not input), select disabled, delete hidden
- [ ] Name input: validation error on empty submit (`z.nonempty()`)
- [ ] Name input: error displayed when callback fails
- [ ] Role select: click opens popover, selecting option calls callback
- [ ] Role select: error displayed when callback fails
- [ ] Role select: stateful round-trip — value updates after callback
- [ ] Delete dialog: opens on trigger click, shows item name and confirmation text
- [ ] Delete dialog: "Batal" closes dialog
- [ ] Delete dialog: Escape key closes dialog
- [ ] Delete dialog: successful confirmation closes dialog

### General
- [ ] Stateful mocks in **shared `mock.ts`** — imported by all test files (when page has reactive hooks)
- [ ] Plain mock factories for **read-only pages** (WithLoader, no reactive hooks, no in-place mutations)
- [ ] Stateful store classes with `useSyncExternalStore` hooks (only when needed)
- [ ] Service factories with `state?` option and per-method `*Error` options
- [ ] All user interactions use `userEvent` — no `fireEvent`, `form.requestSubmit()`
- [ ] All async assertions use `findBy*` or `waitFor`
- [ ] Plain assertions only — no `toHaveTextContent`, `toBeChecked`, `toBeInTheDocument`
- [ ] UI assertions over callback-mock assertions — test what the user sees
- [ ] Error callbacks do NOT mutate the stateful store (item stays visible)
