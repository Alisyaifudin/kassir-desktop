import { Effect } from "effect";
import { createPageData } from "~/components/page-data";
import {
  buildProductGraph,
  loadProductGraphSnapshot,
  ProductGraphError,
  type ProductGraphMode,
  type ProductGraphProgress,
  type ProductGraphStatus,
} from "~/lib/product-graph";

export type NetworkSnapshot = Awaited<ReturnType<typeof loadProductGraphSnapshot>>;

type NetworkData = { snapshot: NetworkSnapshot };

/**
 * This key is a read-once snapshot, refreshed on each entry and after the build.
 * It is deliberately `skip`ped from page-data's memory cache: transactions can
 * change on another route, and a stale network must not be presented as current.
 */
const CACHE = { skip: ["snapshot"] };

export const pageData = createPageData<NetworkData, ProductGraphError>("AnalyticsNetworkPage", {
  cache: CACHE,
});

function errorOf(cause: unknown): ProductGraphError {
  if (cause instanceof ProductGraphError) return cause;
  const message =
    typeof cause === "string"
      ? cause
      : cause instanceof Error
        ? cause.message
        : "Jaringan produk gagal dimuat. Coba lagi.";
  return new ProductGraphError(message);
}

export function readSnapshot(from: number, to: number, mode: ProductGraphMode, nodeLimit: number) {
  return Effect.tryPromise({
    try: () => loadProductGraphSnapshot(from, to, mode, nodeLimit),
    catch: errorOf,
  });
}

export function buildSnapshot(
  from: number,
  to: number,
  mode: ProductGraphMode,
  nodeLimit: number,
  onProgress: (progress: ProductGraphProgress) => void,
): Effect.Effect<ProductGraphStatus, ProductGraphError> {
  return Effect.tryPromise({
    try: () => buildProductGraph(from, to, mode, nodeLimit, onProgress),
    catch: errorOf,
  });
}
