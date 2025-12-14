declare namespace TX {
  type Mode = "sell" | "buy";
  type ValueKind = "number" | "percent";
  type DiscKind = ValueKind | "pcs";
  interface Transaction {
    tab: number;
    tx_mode: Mode;
    tx_query: string;
    tx_fix: number;
    tx_method_id: number;
    tx_note: string;
    tx_customer_name: string;
    tx_customer_phone: string;
    tx_customer_is_new: 0 | 1;
    tx_product_barcode: string;
    tx_product_name: string;
    tx_product_price: number;
    tx_product_qty: number;
    tx_product_stock: number;
    tx_extra_name: string;
    tx_extra_value: number;
    tx_extra_kind: ValueKind;
    tx_extra_is_saved: 0 | 1;
  }
  interface Extra {
    extra_id: string;
    tab: number;
    db_extra_id: number | null;
    extra_name: string;
    extra_kind: ValueKind;
    extra_value: number;
    extra_is_saved: 0 | 1;
  }
  interface Product {
    product_id: string;
    tab: number;
    db_product_id: number | null;
    db_product_price: number | null;
    db_product_name: string | null;
    product_name: string;
    product_barcode: string;
    product_price: number;
    product_qty: number;
    product_stock: number;
  }
  interface Discount {
    disc_id: string;
    product_id: string;
    disc_value: number;
    disc_kind: DiscKind;
  }
}
