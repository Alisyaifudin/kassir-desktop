# use-data Pattern Documentation

This skill documents the `use-data.ts` pattern used for data fetching and state management in the Kassir Desktop application.

## Core Concepts

The application uses a standardized way to fetch data from the database layer, handle loading/error states, and manage cross-component revalidation using a custom `Result` utility based on the `effect` library.

### 1. File Structure

- **Name:** Always `use-data.ts`.
- **Location:** Inside the directory of the page or sub-page (e.g., `src/pages/Stock/Product/use-data.ts`).

### 2. The `KEY` Constant

Define a unique string key at the top of the file. This key is used as the cache identifier in the `Result` store.

```typescript
const KEY = "products";
```

### 3. The `useData` Hook

The primary export of the file is a `useData` hook. It leverages `Result.use` to manage the lifecycle of the data request.

```typescript
export function useData() {
  const res = Result.use({
    fn: () => loader(),
    key: KEY,
    // dependencies that should trigger a re-fetch
    deps: [], 
    // optional: clear cache on unmount
    revalidateOn: { unmount: true }
  });
  return res;
}
```

### 4. Data Loading Logic (`loader` or `program`)

The data fetching logic is encapsulated in an `Effect`. This allows for handled error states and powerful concurrency control.

```typescript
function loader() {
  return Effect.gen(function* () {
    const data = yield* db.product.get.all();
    // Perform any post-fetch transformations here
    return data;
  });
}
```

### 5. Revalidation

To refresh the data from other components (like a create/edit modal), export a `revalidate` function.

```typescript
export function revalidate() {
  Result.revalidate(KEY);
}
```

## Consumption in Components

Components consume the output of `useData` using the `Result.match` utility or by checking the state directly.

### Using `Result.match`

```tsx
import { useData } from "./use-data";
import { Result } from "~/lib/result";

function MyComponent() {
  const res = useData();

  return Result.match(res, {
    onLoading: () => <Loading />,
    onError: (err) => <ErrorView message={err.message} />,
    onSuccess: (data) => <DataView items={data} />,
  });
}
```

### Direct Type Checking

```tsx
function MyComponent() {
  const res = useData();

  if (res.type === "pending") return <Loading />;
  if (res.type === "error") return <Error error={res.error} />;
  
  const data = res.data;
  return <Content data={data} />;
}
```

## Best Practices

1. **Keep it local:** If data is only used in one page, keep `use-data.ts` in that page's directory.
2. **Post-processing:** Do heavy data manipulation or formatting (using `Decimal` or `Temporal`) inside the `loader` rather than in the component.
3. **Typing:** Always export dedicated types for the data returned by the loader to ensure type safety in components.
4. **Cache Management:** Use `revalidateOn: { unmount: true }` if the data is highly ephemeral or shouldn't persist when navigating away.
