# Kassir Desktop

## Backend API Docs
The backend OpenAPI spec is at: `http://192.168.225.187:8787/api/docs/openapi.yaml`
VITE_API_URL is in `.env.local` (never read plain `.env`).

## Sync Pattern
Sync components follow a pull/merge/push loop pattern. Each entity has:
- `src/server/{entity}/` — API calls (get.ts, post.ts)
- `src/lib/sync/{entity}/` — sync logic (pull.ts, merge.ts, push.ts, index.ts)
- `src/database/{entity}/` — local DB operations
- `src/store/sync/{entity}.ts` — last-pull timestamp persistence

Sync components are listed in `src/pages/Setting/Sync/z-Sync.tsx`.
The sync loop runs up to 1000 iterations, stopping when both `count.server === 0` and `count.unsync === 0`.

## Project Structure
- `src/pages/` — route-based page components
- `src/components/` — shared UI components
- `src/lib/` — shared utilities (Effect-based)
- `src/database/` — local SQLite operations
- `src/server/` — API client calls
- `src/store/` — persistent key-value store
- `src-tauri/` — Tauri backend (Rust + SQLite migrations)
