# Sync Engine — Implementation Guide

This document describes how to implement a sync entity following the `customer` pattern.
Use it as a template when adding new entities (e.g., `product`, `record`, `money`, etc.) to the sync engine.

---

## 1. File Layout

For a new entity `<name>`, create these files:

```
src/lib/sync/<name>/
├── index.ts   ←  public API: listener + cleanup
├── state.ts   ←  shared mutable state (pulled buffer, push buffer, cursor)
├── push.ts    ←  chunked push of local data → server
├── pull.ts    ←  handle incoming pull messages, drive merge + push
└── merge.ts   ←  decode → parse → diff → upsert/delete
```

---

## 2. Schemas & Types

### 2.1 `Entry` — the domain type

Defined in `merge.ts`. This is the canonical "flat" shape used throughout the sync layer:

```ts
// merge.ts
import z from "zod";

export const <name>Schema = z.object({
  id: z.string(),
  // ... domain fields ...
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

export type <Name> = z.infer<typeof <name>Schema>;
```

**Required fields on every `Entry`:**
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Primary key |
| `updatedAt` | `number` | Unix timestamp, used for conflict resolution |
| `deletedAt` | `number` (optional) | Soft-delete timestamp; absent = active |

### 2.2 Wire message schemas

Defined in `pull.ts` and `index.ts`:

```ts
// pull.ts
export const pullSchema = z.object({
  phase: z.literal("pull"),
  status: z.enum(["progress", "completed"]),
  data: z.number().array(), // chunked UTF-8 bytes
});

// index.ts
const pushSchema = z.object({
  phase: z.literal("push"),
});

const messageSchema = z.union([pullSchema, pushSchema]);
```

These are **identical** across all entities — copy as-is, only the wire `type` field differs (see §4).

---

## 3. File-by-File Specification

### 3.1 `state.ts` — Shared Mutable State

```ts
// state.ts
/** Accumulated pull bytes from the server. */
export const pulledData: number[] = [];

/** Push buffer and cursor for streaming local data back. */
export const pushState = {
  pushedData: [] as number[],
  pushCursor: 0,
};

/** Reset all shared state (call between sync cycles if needed). */
export function cleanup() {
  pulledData.length = 0;
  pushState.pushedData = [];
  pushState.pushCursor = 0;
}
```

**No changes needed** — copy verbatim for every entity.

---

### 3.2 `push.ts` — Chunked Push

```ts
// push.ts
import WebSocket from "@tauri-apps/plugin-websocket";
import { pushState } from "./state";

export const CHUNK_SIZE = 1024; // bytes per chunk

export function push(ws: WebSocket) {
  const { pushedData, pushCursor } = pushState;
  const chunk = pushedData.slice(pushCursor, pushCursor + CHUNK_SIZE);
  pushState.pushCursor += chunk.length;

  ws.send(
    JSON.stringify({
      type: "<name>", // ← entity-specific
      data: {
        phase: "push",
        status: pushState.pushCursor >= pushedData.length ? "completed" : "progress",
        data: chunk,
      },
    }),
  );
}
```

**One change:** replace `"<name>"` with the entity type string (e.g., `"product"`, `"record"`).

---

### 3.3 `pull.ts` — Handle Pull Messages

```ts
// pull.ts
import { Effect } from "effect";
import z from "zod";
import { db } from "~/database/db";
import WebSocket from "@tauri-apps/plugin-websocket";
import { textUtil } from "~/lib/text-binary";
import { merge } from "./merge";
import { push } from "./push";
import { pulledData, pushState } from "./state";

export const pullSchema = z.object({
  phase: z.literal("pull"),
  status: z.enum(["progress", "completed"]),
  data: z.number().array(),
});

type PullMessage = z.infer<typeof pullSchema>;

export function pull(msg: PullMessage, ws: WebSocket) {
  return Effect.gen(function* () {
    pulledData.push(...msg.data);

    if (msg.status === "progress") {
      ws.send(JSON.stringify({ type: "<name>", status: "progress" }));
      return;
    }

    // completed — merge server data, then push local changes back
    yield* merge(pulledData);

    const lastSyncAt = yield* db.<name>.get.lastSyncAt();
    const entries = yield* db.<name>.get.unsync.after(lastSyncAt);

    pushState.pushedData = yield* textUtil.encode(JSON.stringify(entries));
    pushState.pushCursor = 0;
    push(ws);
  });
}
```

**Two changes:**

1. Replace `"<name>"` in the progress ack
2. Use the correct `db.<name>` paths

---

### 3.4 `merge.ts` — Server Data → Local DB

```ts
// merge.ts
import { Effect } from "effect";
import z from "zod";
import { ZodSchemaError } from "~/lib/effect-error";
import { db } from "~/database/db";
import { parseJson } from "~/lib/utils";
import { textUtil } from "~/lib/text-binary";

const schema = z.object({
  id: z.string(),
  // ... domain fields ...
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});
type Entry = z.infer<typeof schema>;

export function merge(pulledData: number[]) {
  return Effect.gen(function* () {
    // 1. Decode binary → string → JSON
    const str = yield* textUtil.decode(pulledData);
    const json = yield* parseJson(str);

    // 2. Validate
    const parsed = z.safeParse(schema.array(), json);
    if (!parsed.success) return ZodSchemaError.fail(parsed.error);
    const serverData = parsed.data;

    // 3. Get local timestamps for diff
    const now = Date.now();
    const localTimestamps = yield* db.<name>.get.updatedAt(
      serverData.map((e) => e.id),
    );

    // 4. Diff: classify each server entry
    const toUpsert: Entry[] = [];
    const toDelete: string[] = [];

    for (const entry of serverData) {
      const localTs = localTimestamps.get(entry.id);

      if (localTs === undefined) {
        // New — doesn't exist locally
        toUpsert.push(entry);
      } else if (localTs < entry.updatedAt) {
        // Server is newer
        if (entry.deletedAt === undefined) {
          toUpsert.push(entry);
        } else {
          toDelete.push(entry.id);
        }
      }
      // else: local is same or newer — skip
    }

    // 5. Apply
    yield* db.<name>.sync.delete.many(toDelete, now);
    yield* db.<name>.sync.upsert.many(toUpsert, now);
  });
}
```

**Changes:**

- Define the entity-specific `schema` and `Entry` type
- Replace `db.<name>` with the correct DB paths

---

### 3.5 `index.ts` — Public API & Message Router

```ts
// index.ts
import z from "zod";
import { ZodSchemaError } from "~/lib/effect-error";
import WebSocket from "@tauri-apps/plugin-websocket";
import { pull, pullSchema } from "./pull";
import { push } from "./push";
import { cleanup } from "./state";

const pushSchema = z.object({ phase: z.literal("push") });
const messageSchema = z.union([pullSchema, pushSchema]);

export const <name> = {
  listener,
  cleanup,
};

function listener(data: unknown, ws: WebSocket) {
  const parsed = z.safeParse(messageSchema, data);
  if (!parsed.success) return ZodSchemaError.fail(parsed.error);

  switch (parsed.data.phase) {
    case "pull":
      return pull(parsed.data, ws);
    case "push":
      push(ws);
      break;
  }
}
```

**One change:** the export name (`<name>`).

---

## 4. Required `db.<name>` API

The sync layer depends on **5 specific database functions** for each entity.
These must exist in `src/database/db/<name>/`.

| Function                         | Signature                                         | Used in                                                     |
| -------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `get.lastSyncAt()`               | `() => Effect<number>`                            | `pull.ts` — find unsynced local entries                     |
| `get.unsync.after(ts)`           | `(timestamp: number) => Effect<Entry[]>`          | `pull.ts` — list entries changed after `ts`                 |
| `get.updatedAt(ids)`             | `(ids: string[]) => Effect<Map<string, number>>`  | `merge.ts` — diff local vs server timestamps                |
| `sync.delete.many(ids, now)`     | `(ids: string[], now: number) => Effect<void>`    | `merge.ts` — soft-delete entries (set `sync_at = now`)      |
| `sync.upsert.many(entries, now)` | `(entries: Entry[], now: number) => Effect<void>` | `merge.ts` — insert or update entries (set `sync_at = now`) |

### Example: `db/customer/` directory

```
src/database/db/customer/
├── index.ts               ←  aggregates all functions into `export const customer`
├── get-last-sync-at.ts    ←  db.customer.get.lastSyncAt
├── get-unsync-after.ts    ←  db.customer.get.unsync.after
├── get-updated-at.ts      ←  db.customer.get.updatedAt
├── del-many-sync.ts       ←  db.customer.sync.delete.many
├── upsert-many-sync.ts    ←  db.customer.sync.upsert.many
└── cache.ts               ←  in-memory cache (optional)
```

### Example `index.ts` aggregator

```ts
// src/database/db/customer/index.ts
import { getUnsyncCustomersAfter } from "./get-unsync-after";
import { getCustomersUpdatedAt } from "./get-updated-at";
import { getCustomersLastSyncAt } from "./get-last-sync-at";
import { deleteManyCustomersSync } from "./del-many-sync";
import { upsertManyCustomersSync } from "./upsert-many-sync";

export const customer = {
  get: {
    updatedAt: getCustomersUpdatedAt,
    lastSyncAt: getCustomersLastSyncAt,
    unsync: {
      after: getUnsyncCustomersAfter,
    },
  },
  sync: {
    delete: {
      many: deleteManyCustomersSync,
    },
    upsert: {
      many: upsertManyCustomersSync,
    },
  },
};
```

---

## 5. Required `lib` Utilities

These are shared utilities — no per-entity changes needed.

| Utility               | Import               | Signature                                                   | Purpose                             |
| --------------------- | -------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `textUtil.encode`     | `~/lib/text-binary`  | `(text: string) => Effect<number[]>`                        | UTF-8 string → byte array           |
| `textUtil.decode`     | `~/lib/text-binary`  | `(bytes: number[]) => Effect<string>`                       | Byte array → UTF-8 string           |
| `parseJson`           | `~/lib/utils`        | `(v: string) => Effect<unknown>`                            | Safe JSON.parse returning Effect    |
| `ZodSchemaError.fail` | `~/lib/effect-error` | `(error: ZodError) => Effect.Effect<never, ZodSchemaError>` | Convert Zod error to Effect failure |

---

## 6. Wire Protocol

### 6.1 Pull Flow (Server → Client)

```
Server                           Client
  │                                 │
  │── pull:progress, data:[...] ──→│  accumulate bytes
  │←── { type, status:"progress" }─│  ack
  │── pull:progress, data:[...] ──→│  accumulate bytes
  │←── { type, status:"progress" }─│  ack
  │── pull:completed, data:[...] ─→│  accumulate + merge + encode push buffer
  │                                 │  ── push:progress, data:[...] ──→
```

### 6.2 Push Flow (Client → Server)

```
Server                           Client
  │                                 │
  │←── push:progress, data:[...] ──│  first chunk (sent after pull:completed)
  │── push ────────────────────────→│  request next chunk
  │←── push:progress, data:[...] ──│  next chunk
  │── push ────────────────────────→│  request next chunk
  │←── push:completed, data:[...] ─│  final chunk
```

### 6.3 Message Shapes

**Pull (Server → Client)**

```json
{
  "phase": "pull",
  "status": "progress" | "completed",
  "data": [72, 101, 108, 108, 111]  // UTF-8 bytes
}
```

**Push request (Server → Client)**

```json
{
  "phase": "push"
}
```

**Push response (Client → Server)**

```json
{
  "type": "<name>",
  "data": {
    "phase": "push",
    "status": "progress" | "completed",
    "data": [87, 111, 114, 108, 100]  // UTF-8 bytes
  }
}
```

**Pull progress ack (Client → Server)**

```json
{
  "type": "<name>",
  "status": "progress"
}
```

Where `<name>` is the entity type: `"customer"`, `"product"`, `"record"`, etc.

---

## 7. Conflict Resolution

The merge diff algorithm (in `merge.ts`):

| Local State                                   | Server State | Action                   |
| --------------------------------------------- | ------------ | ------------------------ |
| Doesn't exist                                 | Any          | Upsert                   |
| Exists, `local.updatedAt < server.updatedAt`  | Not deleted  | Upsert                   |
| Exists, `local.updatedAt < server.updatedAt`  | Deleted      | Soft-delete local        |
| Exists, `local.updatedAt >= server.updatedAt` | Any          | Skip (local wins or tie) |

---

## 8. Integration in `src/lib/sync/index.ts`

After creating the entity sync module, register it:

```ts
// src/lib/sync/index.ts
import { <name> } from "./<name>";

export const sync = {
  // ... existing entities ...
  <name>,
};
```

---

## 9. Checklist for New Entity

- [ ] `src/lib/sync/<name>/state.ts` — copy verbatim
- [ ] `src/lib/sync/<name>/push.ts` — change `type` string
- [ ] `src/lib/sync/<name>/pull.ts` — change `type` string + `db.<name>` paths
- [ ] `src/lib/sync/<name>/merge.ts` — define schema, diff logic, `db.<name>` paths
- [ ] `src/lib/sync/<name>/index.ts` — export `{ listener, cleanup }`
- [ ] `src/database/db/<name>/` — 5 required functions (see §4)
- [ ] `src/lib/sync/index.ts` — register the new entity
