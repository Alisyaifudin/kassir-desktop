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
  codes: string[];
  capitals: {
    capital: number;
    stock: number;
  }[];
  discounts: Discount[];
};

type RecordExtra = {
  id: string;
  name: string;
  value: number;
  eff: number;
  kind: DBNamespace.ValueKind;
};

export type Transaction = {
  id: string;
  tab: number;
  rounding: number;
  mode: DBNamespace.Mode;
  pay: number;
  note: string;
  fix: number;
  subtotal: number; // total from products
  total: number; // total after extras
  updatedAt: number;
  methods: {
    id: string;
    name?: string;
    kind: DBNamespace.MethodEnum;
  }[];
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
};

export type TransactionFull = Transaction & {
  products: RecordProduct[];
  extras: RecordExtra[];
};

export type TabInfo = {
  tab: number;
  id: string;
};

export type Method = {
  id: string;
  kind: DBNamespace.MethodEnum;
  label?: string;
};
