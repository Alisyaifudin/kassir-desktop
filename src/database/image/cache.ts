export type Image = {
  order: number;
  id: string;
  name: string;
  mime: DB.Mime;
};

export type ImageFull = Image & {
  productId: string;
  updatedAt: number;
  syncAt: number | null;
};

const cache: Map<string, ImageFull[]> = new Map();

/**
 * The cache is the only place an image row lives in memory, so readers that want
 * to stay in sync with the db (the product cover, for one) subscribe to changes
 * instead of keeping a snapshot of their own. Without that, a row written later -
 * a new upload, a delete, a reorder - leaves whoever already looked at it holding
 * a stale answer.
 */
const listeners = new Set<() => void>();

/** Returns the unsubscribe function. */
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

export function getCache(productId: string) {
  return cache.get(productId);
}

export function setCache(productId: string, images: ImageFull[]) {
  cache.set(productId, images);
  notify();
}

export function updateCache(productId: string, updater: (images: ImageFull[]) => ImageFull[]) {
  const data = cache.get(productId);
  // nothing cached for this product means nothing to patch: the next read takes
  // the row from the db, so there is no stale answer to correct either.
  if (data === undefined) return;
  cache.set(productId, updater(data));
  notify();
}

export function revalidateCache() {
  cache.clear();
  notify();
}
