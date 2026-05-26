---
sidebar_position: 11
---

# Arsitektur & Teknis

Dokumentasi teknis untuk pengembang yang ingin memahami arsitektur aplikasi.

## Tech Stack

### Frontend
- **React 19** dengan TypeScript 5.6
- **React Router 7** — hash-based routing
- **Tailwind CSS 4** + **Radix UI** — komponen UI (new-york style, zinc base)
- **Effect-TS 3** — structured error handling
- **@xstate/store** — reactive state management
- **@tanstack/react-form** — form handling
- **Zod 4** + **Valibot 1** — validasi schema
- **pdf-lib** — generate struk PDF
- **fuzzysort** + **@nozbe/microfuzz** — pencarian fuzzy

### Backend (Rust/Tauri)
- **Tauri v2** — desktop shell
- **bcrypt** — hash password
- **jsonwebtoken** — JWT encoding/decoding (HS256, 5 hari)
- **winprint** — Windows printer integration
- **sqlx** — SQLite via embedded Axum server
- **Axum 0.7** — embedded HTTP API (port 3000)

### Database
- **SQLite** via `@tauri-apps/plugin-sql`
- Dua database: `data.db` (41 migrasi) dan `tx.db` (6 migrasi)
- Semua primary key menggunakan TEXT (ULID)
- Setiap entity memiliki `updated_at` dan `sync_at` untuk sinkronisasi

## Struktur Proyek

```
src/
├── assets/
├── components/      # Shared UI components
│   └── ui/          # shadcn/ui primitives (Radix)
├── database/        # SQLite query layer (14 entities)
├── hooks/           # Custom React hooks
├── layouts/         # Route layouts (root + authenticated)
├── lib/             # Utilities, auth, sync, receipt
├── middleware/       # Route middleware (auth, admin)
├── pages/           # Route pages (12 modules)
├── server/          # Cloud API client (5 entities)
├── store/           # Persistent state (xstate-store + plugin-store)
└── transaction/     # Active POS transaction state (tx.db)
src-tauri/
├── src/
│   ├── api/         # Embedded Axum HTTP server
│   ├── database/    # 41 SQL migrations (data.db)
│   └── transaction/ # 6 SQL migrations (tx.db)
└── capabilities/    # Tauri permission scopes
```

## Sinkronisasi

### Protokol

Timestamp-based pull/push:
1. **Pull**: `GET /api/{entity}/{timestamp}` — ambil data baru dari server
2. **Push**: `POST /api/{entity}` — kirim data lokal yang belum sync
3. **Grave**: `DELETE /api/grave` — sinkronkan data yang dihapus

### Alur Sync

```
Produk → Product Events → Record → Method → Grave
```

### Merge Strategy

- Jika data lokal tidak ada → **insert** dari server
- Jika data server lebih baru → **update** lokal
- Jika data lokal lebih baru → pertahankan lokal (push nanti)

## Tauri Commands

| Command | Module | Deskripsi |
|---------|--------|-----------|
| `hash_password` | auth | Hash password dengan bcrypt |
| `verify_password` | auth | Verifikasi password |
| `encode_jwt` | jwt | Buat JWT (HS256, 5 hari) |
| `decode_jwt` | jwt | Decode & validasi JWT |
| `get_printers` | printer | Enumerate printer Windows |
| `print_pdf` | printer | Cetak PDF ke printer |
