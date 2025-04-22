declare namespace DB {
  interface Item {
    name: string;
    price: string;
    stock: number;
    barcode: string | null;
    id: number;
  }
}