export type PocketBase = { id: string; name: string; type: DBNamespace.PocketType };

export type Pocket = PocketBase & {
  ordering: number;
  updatedAt: number;
};

export type PocketFull = Pocket & {
  lastMoney?: number;
};
