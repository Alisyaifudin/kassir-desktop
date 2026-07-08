export type Product = {
  id: string;
  name: string;
  price: number;
  note: string;
  updatedAt: number;
  codes: string[];
  capitals: {
    id: string;
    stock: number;
    capital: number;
  }[];
};

export type HistoryEvent = {
  id: string;
  timestamp: number;
  note: string;
  value: number;
  record?: {
    id: string;
    price: number;
    capital: number;
  };
};

