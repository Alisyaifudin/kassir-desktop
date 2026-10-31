# Kassir Desktop

## Backend API Docs
The backend OpenAPI spec is at: `http://192.168.225.187:8787/api/docs/openapi.yaml`
VITE_API_URL is in `.env.local` (never read plain `.env`).

## Sync Pattern
The wire contract is `backend-docs/sync-contract.md` (client mirror of the backend's
`docs/SYNC-CONTRACT.md`). It is a byte-stream protocol, not the old REST/timestamp API:
NDJSON frames, a sha256 prefix chain, LWW on `_updated_at`.

- `src-tauri/src/sync.rs` — the HTTP + stream transport. The webview cannot reach the
  sync host (CSP) and has no streaming body, so pulls and upload acks are read here and
  pushed to JS over a Tauri `Channel`. Commands: `sync_health`, `sync_create_session`,
  `sync_get_session`, `sync_delete_session`, `sync_pull`, `sync_upload_chunk`,
  `sync_chain`, `sync_cancel`.
- `src/services/sync/` — the service. `schema.ts` is the single source of the canonical
  column order; `frames.ts` encodes/decodes, `sql.ts` builds the merge SQL, `merge.ts`
  applies the contract's merge rules, `pull.ts`/`push.ts` are the loops, `stream.ts` is
  the Streams-API polyfill over the channel, `transport.ts` wraps the Rust commands,
  `live.ts` wires cursors (store.json `sync.*`), progress and service refreshes.
- `src/pages/Setting/Sync/` — the Sinkronisasi screen (admin-only).

Merges never go through a page: the sync service owns the mirror SQL and then calls the
owning service's `refresh()` so the UI refs see the merged rows.

## Project Structure
- `src/pages/` — route-based page components
- `src/components/` — shared UI components
- `src/lib/` — shared utilities (Effect-based)
- `src/database/` — local SQLite operations
- `src/server/` — API client calls
- `src/store/` — persistent key-value store
- `src-tauri/` — Tauri backend (Rust + SQLite migrations)
