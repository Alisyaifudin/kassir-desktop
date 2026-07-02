export type PocketBase = { id: string; name: string; type: DBNamespace.PocketType };

export type Pocket = PocketBase & {
  ordering: number;
  updatedAt: number;
};

export type PocketFull = Pocket & {
  lastMoney?: number;
};

export type Money = {
  id: string;
  timestamp: number;
  value: number;
  pocketId: string;
  note: string;
  diff: number;
  updatedAt: number;
};


export type MoneyImport = {
  timestamp: number;
  note: string;
  value: number;
};

export type NewMoney = {
  value: number;
  pocketId: string;
  type: DBNamespace.PocketType;
  note: string;
};
