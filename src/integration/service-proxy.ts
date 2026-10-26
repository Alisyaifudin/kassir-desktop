import type { AppService } from "~/services/wiring";

/**
 * The one seam the integration tests use to hand the pages a service.
 *
 * `src/services/index.ts` resolves `globalThis.__KASSIR_SERVICE__` at import time
 * (the same hook the e2e harness uses), and components import that module
 * directly. A test cannot replace the binding afterwards, so the bind is a
 * stable proxy: it is installed once, before any page import, and resolves every
 * property against the service of the test that is running.
 *
 * Keeping the target in a `globalThis` slot rather than this module's scope is
 * deliberate: bun caches `~/services` (and therefore the bound proxy) across test
 * files, and a second file's module instance would otherwise set a value the
 * pages never read.
 */
type Resolver = {
  __KASSIR_SERVICE__?: AppService;
  __KASSIR_TEST_SERVICE__?: AppService;
};

const scope = globalThis as unknown as Resolver;

const proxy = new Proxy({} as AppService, {
  get: (_target, key) => scope.__KASSIR_TEST_SERVICE__?.[key as keyof AppService],
});

scope.__KASSIR_SERVICE__ = proxy;

/** Point the pages at the service built for the current test. */
export function offerService(service: AppService): AppService {
  scope.__KASSIR_TEST_SERVICE__ = service;
  return service;
}

export function currentService(): AppService {
  const service = scope.__KASSIR_TEST_SERVICE__;
  if (service === undefined) throw new Error("no service has been offered to the pages");
  return service;
}
