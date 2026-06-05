import { CacheItem } from "~/lib/cache-factory";

export type Social = {
  id: string;
  name: string;
  value: string;
};

export type SocialFull = Social & {
  updatedAt: number;
  syncAt?: number;
};

export const cache = new CacheItem<SocialFull>();
