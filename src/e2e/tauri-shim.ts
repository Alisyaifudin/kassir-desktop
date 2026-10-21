/**
 * Minimal `window.__TAURI_INTERNALS__` for the browser harness.
 *
 * `@tauri-apps/api`'s `invoke` resolves through this object, so installing it
 * lets the few modules that still talk to Rust directly (password hashing in
 * `src/lib/auth.ts`) run without the Tauri process. Everything else is expected
 * to be layer-swapped in `src/e2e/main.tsx`; an unhandled command throws so a
 * missing fake is loud instead of silently returning `undefined`.
 *
 * Password hashing is *not* bcrypt here — it is `plain:` + password, which
 * matches what the seeded cashiers use. Real bcrypt is Rust-side and belongs in
 * the native WDIO suite.
 */
const HASH_PREFIX = "plain:";

type Args = Record<string, unknown>;

const handlers: Record<string, (args: Args) => unknown> = {
  hash_password: ({ password }) => `${HASH_PREFIX}${String(password)}`,
  verify_password: ({ password, hash }) => `${HASH_PREFIX}${String(password)}` === hash,
};

export function installTauriShim() {
  const internals = {
    invoke: async (command: string, args?: Args) => {
      const handler = handlers[command];
      if (!handler) throw new Error(`[e2e] unmocked Tauri command: ${command}`);
      return handler(args ?? {});
    },
    transformCallback: () => 0,
    unregisterCallback: () => {},
    convertFileSrc: (src: string) => src,
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { windowLabel: "main", label: "main" },
    },
  };

  (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = internals;
}
