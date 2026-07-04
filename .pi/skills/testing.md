# Testing Best Practices

This project uses [Bun Test](https://bun.sh/docs/test/writing) with [Testing Library](https://testing-library.com/docs/react-testing-library/intro) for all React component and page tests.

---

## Table of Contents

1. [Setup & Tooling](#setup--tooling)
2. [Two-Tier Testing Strategy](#two-tier-testing-strategy)
3. [Page-Level Tests](#page-level-tests)
4. [z-* Component Tests](#z--component-tests)
5. [Mock Services](#mock-services)
6. [StateWrap Testing](#statewrap-testing)
7. [User Interaction](#user-interaction)
8. [Dialog Testing](#dialog-testing)
9. [Query Patterns](#query-patterns)
10. [Anti-Patterns](#anti-patterns)
11. [Test File Structure](#test-file-structure)
12. [Checklist](#checklist)

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

Pure React components receive everything via props. No Effect, no service injection.

### Structure

```tsx
// src/pages/Example/__test/z-List.test.tsx
import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List } from "../z-List";
import { render } from "~/lib/render";

const mockItems: Item[] = [
  { id: "1", name: "Foo" },
  { id: "2", name: "Bar" },
];

function renderList(opts?: {
  items?: Item[];
  onDelete?: (id: string) => Promise<string | null>;
}) {
  return render(
    <List
      useItems={() => opts?.items ?? mockItems}
      onDelete={opts?.onDelete ?? (() => Promise.resolve(null))}
    />,
  );
}

describe("List", () => {
  test("renders all items", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText("Foo")).toBeInTheDocument();
      expect(screen.getByText("Bar")).toBeInTheDocument();
    });
  });

  test("calls onDelete when delete button clicked", async () => {
    const onDelete = mock(async (_id: string) => null);
    const user = userEvent.setup();
    renderList({ onDelete });

    await user.click(await screen.findByRole("button", { name: /delete 1/i }));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("1");
    });
  });
});
```

### Key points

- **`renderList` helper** renders the component with default props, accepts overrides
- **`mock(async (...) => ...)` from bun** creates a callable mock that returns a Promise
- **No `Effect.gen`, no `yield*`, no `Layer`** — just JSX with props
- **Callbacks are `() => Promise.resolve(null)` by default** (success case)

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
test("selecting user, typing password, and submitting calls onCheck", async () => {
  const onCheck = mock((_id: string, _password: string) => Effect.succeed({ ... }));
  const user = userEvent.setup();
  renderForm({ onCheck });

  // 1. Open the select popover
  await user.click(screen.getByRole("combobox"));

  // 2. Click the option
  await user.click(await screen.findByRole("option", { name: "Budi" }));

  // 3. Type remaining fields
  await user.type(screen.getByLabelText("Kata sandi"), "secret123");

  // 4. Submit via fireEvent.submit on the <form> directly.
  //    The submit button may still appear disabled because @tanstack/react-form
  //    lags re-rendering in test DOMs, but the hidden native <select> proves
  //    the form state IS updated.
  fireEvent.submit(document.querySelector("form")!);

  await waitFor(() => {
    expect(onCheck).toHaveBeenCalledWith("1", "secret123");
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
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
});
```

### Submitting inside a dialog

```tsx
test("submitting form calls onAdd", async () => {
  const onAdd = mock(async (name: string) => null);
  const user = userEvent.setup();
  renderComponent({ onAdd });

  // Open the dialog
  await user.click(await screen.findByRole("button", { name: /tambah/i }));
  // Fill the form
  await user.type(screen.getByPlaceholderText("Nama"), "Dian");
  // Submit
  await user.click(screen.getByRole("button", { name: /tambahkan/i }));

  await waitFor(() => {
    expect(onAdd).toHaveBeenCalledWith("Dian");
  });
});
```

### Closing a dialog

```tsx
// Close with "Batal" button
await user.click(screen.getByRole("button", { name: /batal/i }));
await waitFor(() => {
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

**Use `queryByRole` for assertions about absence** — `getByRole` throws if not found, `queryByRole` returns `null`.

### Assert dialog content

```tsx
expect(screen.getByRole("heading", { name: /tambah/i })).toBeInTheDocument();
expect(screen.getByRole("textbox")).toBeInTheDocument();
```

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
- **Don't assert negative with `getBy*`** — use `queryBy*` and `expect(...).not.toBeInTheDocument()`
- **Don't forget to flush deferred promises** — always resolve and `await waitFor` after testing loading state
- **Don't use `Promise.reject` for error mocks** — `StateWrap`'s `loader` is passed through `promisify`, which catches Effect failures
- **Don't pass raw `Promise.resolve(error)` as loader** — use `Effect.fail(error)` for error states
- **Don't import `render` from `@testing-library/react`** — use `~/lib/render` which includes `MemoryRouter`
- **Don't create `Layer.effect` for simple mocks** — `Layer.succeed` with a plain object is enough
- **Don't test `@tanstack/react-form` internals** — test that callbacks are/aren't called, not that specific validation error messages render
- **Don't pass service objects to React land in tests either** — mock services return the same interface but are plain objects

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
    ├── page.test.tsx          ← page-level: Effect + StateWrap
    ├── z-List.test.tsx        ← pure component: props → render → assert
    └── z-NewItem.test.tsx     ← pure component: props → render → assert
```

- One test file per source file
- Test file mirrors the source name: `z-Foo.tsx` → `z-Foo.test.tsx`
- `page.test.tsx` covers the `Effect.gen` resolution AND the rendered page with mocked services

---

## Checklist

When adding tests for a page, verify:

- [ ] **`page.test.tsx`** — Effect resolution with all services provided
- [ ] **`page.test.tsx`** — Loading skeleton while loader is pending (`Effect.promise(() => deferred.promise)`)
- [ ] **`page.test.tsx`** — Error message when loader fails (`Effect.fail`)
- [ ] **`page.test.tsx`** — Mock services return `Effect.void` for success, `Effect.fail(error)` for errors
- [ ] **`page.test.tsx`** — Heading, description, and key elements visible on success
- [ ] **`z-List.test.tsx`** — All items rendered with correct data
- [ ] **`z-List.test.tsx`** — Empty list renders no children (not zero)
- [ ] **`z-List.test.tsx`** — Callbacks invoked with correct arguments on user interaction
- [ ] **`z-NewItem.test.tsx`** — Dialog opens on trigger click
- [ ] **`z-NewItem.test.tsx`** — Form submission calls callback with correct arguments
- [ ] **`z-NewItem.test.tsx`** — Error message shown when callback returns error
- [ ] **`z-NewItem.test.tsx`** — Dialog closes on cancel
- [ ] **`z-NewItem.test.tsx`** — Dialog closes on success (if applicable)
- [ ] All user interactions use `userEvent` — no `fireEvent`, `form.requestSubmit()`, or raw DOM
- [ ] All async assertions use `findBy*` or `waitFor` — no bare `getBy*` for async content
