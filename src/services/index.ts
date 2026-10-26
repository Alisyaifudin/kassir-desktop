import { appLive, makeService, type AppService } from "./wiring";

export { buildAppLive, hiddenLive, makeService } from "./wiring";
export type { AppService, HiddenLive } from "./wiring";

/**
 * The app reads `service` as a module singleton.
 *
 * The end-to-end harness (`src/e2e/`) swaps the SQLite backend for an in-browser
 * one, but it cannot hand us a layer: components resolve this module directly,
 * so the instance has to be replaced at boot. It sets `globalThis.__KASSIR_SERVICE__`
 * before the router is imported and we pick it up here. The bun integration tests
 * (`src/integration/`) use the same seam, which is why the branch also opens in a
 * test build; both gates are compile-time constants, so a production build still
 * eliminates the branch.
 */
const injected =
  import.meta.env.DEV || import.meta.env.NODE_ENV === "test"
    ? (globalThis as { __KASSIR_SERVICE__?: AppService }).__KASSIR_SERVICE__
    : undefined;

export const service: AppService = injected ?? makeService(appLive);
