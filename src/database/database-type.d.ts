declare namespace DB {
  type Role = "admin" | "user";
  type ValueKind = "number" | "percent";
  type DiscKind = ValueKind | "pcs";
  type Mode = "sell" | "buy";
  type MoneyType = "absolute" | "change";
  type MethodEnum = "cash" | "transfer" | "debit" | "qris";
  type Mime = "image/png" | "image/jpeg";
  type GraveKind =
    | "customer"
    | "money_kind"
    | "money"
    | "social"
    | "product"
    | "image"
    | "extra"
    | "method"
    | "record";

  interface Grave {
    grave_id: string;
    grave_item_id: string;
    grave_kind: GraveKind;
    grave_timestamp: number;
  }

  type ProductEventEnum = "manual" | "inc" | "dec";
  interface ProductEvent {
    id: string;
    created_at: number;
    sync_at: number | null;
    type: ProductEventEnum;
    value: number;
    product_id: string;
  }

  interface Cashier {
    cashier_id: string;
    cashier_name: string;
    cashier_role: Role;
    cashier_hash: string;
  }
  interface Image {
    image_id: string;
    image_name: string;
    image_mime: Mime;
    image_order: number;
    product_id: string;
    image_updated_at: number;
    image_sync_at: number | null;
  }
  interface Social {
    social_name: string;
    social_id: string;
    social_value: string;
    social_updated_at: number;
    social_sync_at: number | null;
  }
  interface MoneyKind {
    money_kind_id: string;
    money_kind_name: string;
    money_kind_type: MoneyType;
    money_kind_updated_at: number;
    money_kind_sync_at: number | null;
  }
  interface Money {
    money_id: string;
    timestamp: number;
    money_value: number;
    money_kind_id: string;
    money_note: string;
    money_updated_at: number;
    money_sync_at: number | null;
  }
  interface Customer {
    customer_id: string;
    customer_phone: string;
    customer_name: string;
    customer_updated_at: number;
    customer_sync_at: number | null;
  }
  interface RecordExtra {
    record_extra_id: string;
    record_extra_name: string;
    record_id: string;
    record_extra_value: number;
    record_extra_eff: number;
    record_extra_kind: ValueKind;
  }
  interface Discount {
    discount_id: string;
    record_product_id: string;
    discount_value: number;
    discount_eff: number;
    discount_kind: DiscKind;
  }
  interface RecordProduct {
    record_product_id: string;
    product_id: string | null;
    record_id: string;
    record_product_name: string;
    record_product_price: number;
    record_product_qty: number;
    record_product_capital: number;
    record_product_capital_raw: number;
    record_product_total: number; // total including discount
  }
  interface Record {
    record_id: string;
    method_id: string;
    record_paid_at: number;
    record_rounding: number;
    record_is_credit: 0 | 1;
    record_cashier: string;
    record_mode: Mode;
    record_pay: number;
    record_note: string;
    record_fix: number;
    record_customer_name: string;
    record_customer_phone: string;
    record_sub_total: number; // total from record_product, including discounts
    record_total: number; // total after including extra
    record_updated_at: number;
    record_sync_at: number | null;
  }
  interface Method {
    method_id: string;
    method_name: string | null;
    method_kind: MethodEnum;
    // ("1000", 'cash'), ("1001", 'transfer'), ("1002", 'debit'), ("1003", 'qris');
    method_deleted_at: number | null;
    method_updated_at: number;
    method_sync_at: number | null;
  }
  interface Extra {
    extra_id: string;
    extra_name: string;
    extra_value: number;
    extra_kind: ValueKind;
    extra_updated_at: number;
    extra_sync_at: number | null;
  }
  interface Product {
    product_id: string;
    product_barcode: string | null;
    product_name: string;
    product_price: number;
    product_stock: number;
    product_capital: number;
    product_note: string;
    product_updated_at: number;
    product_sync_at: number | null;
  }
}
