declare namespace DB {
  interface Item {
    name: string;
    price: string;
    stock: number;
    barcode: string | null;
    id: number;
  }
  interface Record {
    id: number;
    time: number;
    total: string;
    pay: string;
    disc_val: string | null;
    disc_type: "number"|"percent"|null;
    change: string;
  }
  interface RecordItem {
    id: number;
    record_id: number;
    name: string;
    price: string;
    qty: number;
    subtotal: string;
    disc_val: string | null;
    disc_type: "number"|"percent"|null;
    time: number;
  }
}
