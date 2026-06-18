declare namespace DB {
  type Role = "admin" | "user";
  type ValueKind = "number" | "percent";
  type DiscKind = ValueKind | "pcs";
  type Mode = "sell" | "buy";
  type PocketType = "absolute" | "change";
  type MethodEnum = "cash" | "transfer" | "debit" | "qris";
  type Mime = "image/png" | "image/jpeg";

  // type ProductEventEnum = "manual" | "inc" | "dec";
  // type ProductEventEnum = "absolute" | "change";

  interface ProductEvent {
    product_event_id: string;
    timestamp: number;
    product_event_sync_at: number | null;
    // product_event_type: ProductEventEnum;
    product_event_value: number;
    product_event_note: string;
    capital_id: string;
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
    image_deleted_at: number | null;
    image_hash: string | null;
  }
  interface Social {
    social_name: string;
    social_id: string;
    social_value: string;
    social_updated_at: number;
    social_sync_at: number | null;
    social_deleted_at: number | null;
  }
  interface Pocket {
    pocket_id: string;
    pocket_name: string;
    pocket_type: PocketType;
    pocket_ordering: number;
    pocket_updated_at: number;
    pocket_sync_at: number | null;
    pocket_deleted_at: number | null;
  }
  interface Money {
    money_id: string;
    timestamp: number;
    money_value: number;
    pocket_id: string;
    money_note: string;
    money_updated_at: number;
    money_sync_at: number | null;
    money_deleted_at: number | null;
  }
  interface Customer {
    customer_id: string;
    customer_phone: string;
    customer_name: string;
    customer_updated_at: number;
    customer_sync_at: number | null;
    customer_deleted_at: number | null;
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
    product_event_id: string | null;
    record_id: string;
    record_product_name: string;
    record_product_price: number;
    record_product_qty: number;
    record_product_capital: number;
    record_product_total: number; // total including discount
  }
  interface Record {
    record_id: string;
    method_id: string;
    record_paid_at: number;
    record_created_at: number;
    record_rounding: number;
    record_credit_at: number | null;
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
    record_deleted_at: number | null;
  }
  interface Method {
    method_id: string;
    method_name: string | null;
    method_label: string | null;
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
    extra_deleted_at: number | null;
  }
  interface Product {
    product_id: string;
    product_name: string;
    product_price: number;
    product_note: string;
    product_updated_at: number;
    product_sync_at: number | null;
  }
  interface ProductCode {
    product_code: string;
    product_id: string;
  }
  interface Capital {
    capital_id: string;
    capital_stock: number;
    capital_deleted_at: number | null;
    capital_sync_at: number | null;
    capital_updated_at: number;
    capital_capital: number;
    product_id: string;
  }
}
