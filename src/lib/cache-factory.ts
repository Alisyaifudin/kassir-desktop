export class CacheItem<T extends { id: string }> {
  private _cache = new Map<string, T>();
  private _all: T[] | null = null;
  set(items: T[]) {
    this._cache.clear();
    this._all = null;
    for (const p of items) {
      this._cache.set(p.id, p);
    }
  }
  get size() {
    return this._cache.size;
  }
  get(id: string) {
    return this._cache.get(id);
  }
  all() {
    if (this._cache.size === 0) return null;
    if (this._all === null) {
      this._all = Array.from(this._cache.values());
    }
    return this._all;
  }
  updateAll(cb: (item: T) => T) {
    if (this._all === null) return;
    for (let i = 0; i < this._all.length; i++) {
      const item = this._all[i];
      const updated = cb(item);
      this._cache.set(item.id, updated);
      this._all[i] = updated;
    }
  }
  update(id: string, item: T): void;
  update(id: string, cb: (item: T) => T): void;
  update(id: string, second: T | ((item: T) => T)) {
    if (typeof second === "function") {
      const item = this._cache.get(id);
      if (item === undefined) return;
      const updated = second(item);
      this._cache.set(id, updated);
      if (this._all) {
        this._all = Array.from(this._cache.values());
      }
      return;
    }
    this._cache.set(id, second);
    if (this._all) {
      this._all = Array.from(this._cache.values());
    }
  }
  delete(id: string) {
    this._cache.delete(id);
    if (this._all) {
      this._all = this._all.filter((v) => v.id !== id);
    }
  }
  revalidate() {
    if (this._cache === undefined || this._all === undefined) return;
    this._cache.clear();
    this._all = null;
  }
}
