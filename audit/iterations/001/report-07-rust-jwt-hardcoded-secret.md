---
slug: rust-jwt-hardcoded-secret
title: "Unused, forgeable JWT IPC commands with a hard-coded signing secret"
severity: medium
category: security
iteration: 1
created: 2026-10-21T17:31:10.893Z
files:
  - "src-tauri/src/jwt.rs"
  - "src-tauri/src/auth.rs"
  - "src-tauri/src/lib.rs"
  - "src-tauri/src/printer.rs"
  - "src-tauri/Cargo.toml"
  - "src/services/auth/live.ts"
---

# Unused, forgeable JWT IPC commands with a hard-coded signing secret

- **Severity:** medium
- **Category:** security
- **Files:** `src-tauri/src/jwt.rs`, `src-tauri/src/auth.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/printer.rs`, `src-tauri/Cargo.toml`, `src/services/auth/live.ts`
- **Iteration:** 1

## Summary

`src-tauri/src/jwt.rs` ships `encode_jwt`/`decode_jwt` IPC commands signed with a hard-coded secret (`"super_secret_coy"`) while the app's real session is an unvalidated `localStorage` object; the commands are unused. It also contains a `panic!` on unknown roles, `expect` on timestamps, and bcrypt hashing that blocks the async runtime.

## Details

## Evidence

`src-tauri/src/jwt.rs`:

```rust
static ENV: &'static str = "super_secret_coy";        // line 60

impl From<String> for Role {
    fn from(value: String) -> Self {
        match value.as_str() {
            "user" => Role::User, "admin" => Role::Admin,
            _ => panic!("invalid value"),             // line 21
        }
    }
}

#[tauri::command]
pub fn encode_jwt(name: String, role: String) -> Result<String, JwtError> { … }   // line 63
#[tauri::command]
pub fn decode_jwt(token: String) -> Result<UserClaims, JwtError> { … }            // line 82
```

Both are registered in the IPC surface:

```rust
.invoke_handler(tauri::generate_handler![
    auth::hash_password, auth::verify_password,
    jwt::decode_jwt, jwt::encode_jwt,
    printer::get_printers, printer::print_pdf,
]);
```

…and **nothing in `src/` calls them**:

```
$ rg -n "encode_jwt|decode_jwt" src
# (no matches outside src/e2e shims, which only stub hash/verify)
```

So the app ships a command that signs an admin JWT with a secret compiled into the binary, and a command that decodes any JWT with the same secret. Sessions do not use it: `AuthLive` stores `{id,name,role}` in `localStorage` (`src/services/auth/live.ts`, `USER_KEY`) and re-validates only that the cashier row still exists — the role is whatever the client wrote. The JWT is dead code with a live signing key.

`src-tauri/src/printer.rs` also shows the pattern of leaking internals to the UI:

```rust
return Err(format!(
  "Invalid PDF: missing PDF header. Found '{:?}' instead of '%PDF'. \
   Make sure you're sending raw PDF bytes, not base64 or JSON. \
   First 20 bytes: {}", …
));
```
(`lib/printer.ts` turns that string straight into a user-facing message.)

And in `auth.rs`, bcrypt runs synchronously inside an `async fn`:

```rust
#[tauri::command]
pub async fn hash_password(password: String) -> Result<String, AuthError> {
    hash(&password, DEFAULT_COST)      // ~250 ms blocking on a tokio worker
}
```

## Why it matters

- **Forgeable identity.** `encode_jwt` will mint `{role: "admin"}` for anyone who can call it; the secret is recoverable from the binary. Today nothing consumes the token, so the risk is latent — but the day sync/HTTP moves to "send the JWT" this becomes an admin bypass, and the secret is already public in git history.
- **Attack surface with no owner.** Two IPC commands, a `panic!` path (`Role::from`), and an `expect("Invalid timestamp")` exist to support code nobody calls. Deleting them is free.
- **Blocking the async runtime** on every login/hash: bcrypt at `DEFAULT_COST` (~250 ms) on a tokio worker thread stalls other commands scheduled on the same runtime; `tauri::async_runtime::spawn_blocking` is the intended shape.
- **Error strings leak internals** to cashiers: `format!("... Found '{:?}' ...")` prints raw bytes and implementation hints in the UI.

## Recommended fix

1. Delete `src-tauri/src/jwt.rs`, both `generate_handler!` entries, and the `jsonwebtoken` dependency. Sessions are local and already validated through `CashierService`; if signed sessions are ever needed, generate the secret at first run, store it with `tauri-plugin-store`/keyring, and never commit it.
2. If the JWT must stay for a future sync feature, replace `static ENV` with a randomly generated per-install key, remove `encode_jwt` from the IPC surface (only the Rust side should sign), and burn any token issued with the current secret.
3. Wrap bcrypt in `tauri::async_runtime::spawn_blocking`; consider `DEFAULT_COST` for the initial hash and a lower cost for verify-time only if login latency matters.
4. Replace `panic!("invalid value")` with a `Result<Role, JwtError>` (`InvalidRole` already exists) and drop the `expect("Invalid timestamp")`.
5. Cap error payloads at the Rust boundary: return a small enum (`PdfNotValid`, `PrinterNotFound`, …) and render the human text in the frontend (`src/pages/...`), not the raw `format!` string.

## Acceptance criteria

- `rg -n "super_secret_coy|encode_jwt|decode_jwt" src-tauri src` returns nothing.
- `jsonwebtoken` is not in `Cargo.toml` (or is used only server-side with a per-install key).
- No `panic!`/`expect` on user-influenced input in `src-tauri/src/**`.
- Password hashing does not block the async runtime (verified by two concurrent commands not serialising).
- Printed/returned errors contain no raw byte dumps, paths, or stack hints.

## Verification

- `cargo build --release` and `strings src-tauri/target/release/kassir.exe | grep super_secret` → empty.
- Attempt `invoke("encode_jwt", {name:"x", role:"admin"})` from the devtools console in a debug build before/after the change (should not exist after).
- Trigger a print with a non-PDF buffer and confirm the message the cashier sees is a plain sentence.
