declare namespace DB {
  type Role = "admin" | "user";
  type ValueKind = "number" | "percent";
  type DiscKind = ValueKind | "pcs";
  type MoneyEnum = "saving" | "debt" | "diff";
  type Mode = "sell" | "buy";
  type MethodEnum = "cash" | "transfer" | "debit" | "qris";
  type Mime = "image/png" | "image/jpeg"

  interface Cashier {
    cashier_name: string;
    cashier_role: Role;
    cashier_hash: string;
  }
  interface Image {
    img_id: number;
    img_name: string;
    img_mime: Mime;
    product_id: number;
  }
  interface Social {
    social_name: string;
    social_id: number;
    social_value: string;
  }
  interface Money {
    timestamp: number;
    money_value: number;
    money_kind: MoneyEnum;
  }
  interface Customer {
    customer_id: number;
    customer_phone: string;
    customer_name: string;
  }
  interface RecordExtra {
    record_extra_id: number;
    record_extra_name: string;
    timestamp: number;
    record_extra_value: number;
    record_extra_eff: number;
    record_extra_kind: ValueKind;
  }
  interface Discount {
    disc_id: number;
    record_product_id: number;
    disc_value: number;
    disc_eff: number;
    disc_kind: ValueKind;
  }
  interface RecordProduct {
    record_product_id: number;
    product_id: number | null;
    timestamp: number;
    record_product_name: string;
    record_product_price: number;
    record_product_qty: number;
    record_product_capital: number;
    record_product_capital_raw: number;
    record_product_total: number; // total including discount
  }
  interface Record {
    timestamp: number; // primary key
    record_paid_at: number;
    record_rounding: number;
    record_is_credit: 0 | 1;
    record_cashier: string;
    record_mode: Mode;
    record_pay: number;
    record_note: string;
    method_id: number;
    record_fix: number;
    record_customer_name: string;
    record_customer_phone: string;
    record_sub_total: number; // total from record_product, including discounts
    record_total: number; // total after including extra
  }
  interface Method {
    method_id: number;
    method_name: string | null;
    method_kind: MethodEnum;
    // (1000, 'cash'), (1001, 'transfer'), (1002, 'debit'), (1003, 'qris');
    method_deleted_at: number | null;
  }
  interface Extra {
    extra_id: number;
    extra_name: string;
    extra_value: number;
    extra_kind: ValueKind;
  }
  interface Product {
    product_id: number;
    product_barcode: string | null;
    product_name: string;
    product_price: number;
    product_stock: number;
    product_capital: number;
    product_note: string;
  }
}
