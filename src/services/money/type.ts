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
