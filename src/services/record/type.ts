type Discount = {
  id: string;
  value: number;
  eff: number;
  kind: DBNamespace.DiscKind;
};

type RecordProduct = {
  id: string;
  name: string;
  price: number;
  qty: number;
  capital: number;
  total: number;
  eventId?: string;
  discounts: Discount[];
};

type RecordExtra = {
  id: string;
  name: string;
  value: number;
  eff: number;
  kind: DBNamespace.ValueKind;
};

export type Record = {
  id: string;
  createdAt: number;
  paidAt: number;
  rounding: number;
  creditAt?: number;
  cashier: string;
  mode: DBNamespace.Mode;
  pay: number;
  note: string;
  fix: number;
  subtotal: number;
  total: number;
  updatedAt: number;
  method: {
    id: string;
    name?: string;
    kind: DBNamespace.MethodEnum;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  products: RecordProduct[];
  extras: RecordExtra[];
};
