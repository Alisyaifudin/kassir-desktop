# Effect-ts Best Practices for Kassir

This skill provides patterns for using `effect` in the Kassir codebase.

## Core Patterns

### 1. Basic Effect

Always prefer `Effect.gen` for readability:

```typescript
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const data = yield* fetchData;
  return data;
});
```

### 2. Error Handling

Use `Effect.catchTag` or `Effect.catchAll` for domain-specific errors.

### 3. Integration with React

Use `useMemo` or custom hooks to run effects if they aren't provided by a library integration.
