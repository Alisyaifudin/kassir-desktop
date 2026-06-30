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