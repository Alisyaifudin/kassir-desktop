export type Image = {
  order: number;
  id: string;
  name: string;
  mime: DBNamespace.Mime;
};

export type ImageFull = Image & {
  productId: string;
  updatedAt: number;
  syncAt?: number;
  hash?: string;
};

const _cache: Map<string, ImageFull[]> = new Map();

export const cache = {
  getAll() {
    const values = Array.from(_cache.values()).flat();
    return values;
  },
  get(productId: string) {
    return _cache.get(productId);
  },
  set(productId: string, images: ImageFull[]) {
    _cache.set(productId, images);
  },
  update(productId: string, updater: (images: ImageFull[]) => ImageFull[]) {
    const data = _cache.get(productId);
    if (data !== undefined) {
      _cache.set(productId, updater(data));
    }
  },
  revalidate() {
    _cache.clear();
  },
};
