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

export function getCache(productId: string) {
  return cache.get(productId);
}

export function setCache(productId: string, images: ImageFull[]) {
  cache.set(productId, images);
}

export function updateCache(productId: string, updater: (images: ImageFull[]) => ImageFull[]) {
  const data = cache.get(productId);
  if (data !== undefined) {
    cache.set(productId, updater(data));
  }
}

export function revalidateCache() {
  cache.clear();
}
