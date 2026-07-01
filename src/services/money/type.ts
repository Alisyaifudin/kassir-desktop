export type Pocket = {
  id: string;
  name: string;
  type: DBNamespace.PocketType;
  ordering: number;
  updatedAt: number;
};

export type Money = {
  id: string;
  timestamp: number;
  value: number;
  pocketId: string;
  note: string;
  updatedAt: number;
};
