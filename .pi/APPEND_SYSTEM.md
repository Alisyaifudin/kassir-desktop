## Project Version

The project version is defined across **four files** that must always stay in sync:

| File | Pattern |
|---|---|
| `package.json` | `"version": "X.Y.Z"` |
| `src/lib/constants.ts` | `export const version = "X.Y.Z";` |
| `src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` |
| `src-tauri/Cargo.toml` | `version = "X.Y.Z"` (under `[package]`) |

When the user asks to bump the version, update **all four files** to the same new version.
