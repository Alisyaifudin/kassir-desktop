# Advanced Effect-ts Patterns

Beyond basic `Effect.gen`, use these patterns for a robust codebase.

## 2. Service Pattern (Layers)
When interacting with Tauri APIs or Databases, wrap them in a Service.
```typescript
interface DBService { readonly query: (sql: string) => Effect<unknown, DBError> }
const DBService = Context.Tag<DBService>()
```

## 4. Pipeline Clarity
Use `pipe` only when necessary for readability; otherwise, prefer `yield*` inside `Effect.gen`.
