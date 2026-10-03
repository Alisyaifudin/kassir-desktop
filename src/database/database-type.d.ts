declare namespace DB {
  type Role = "admin" | "user";
  type ValueKind = "number" | "percent";
  type DiscKind = ValueKind | "pcs";
  type Mode = "incoming" | "outcoming";
  type MoneyType = "absolute" | "change";
  type MethodEnum = "cash" | "transfer" | "debit" | "qris";
  type Mime = "image/png" | "image/jpeg";
  type CodeKind = "barcode" | "qr";
  type ProductEventEnum = "manual" | "inc" | "dec";

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
  }
  interface Social {
    social_name: string;
    social_id: string;
    social_value: string;
    social_updated_at: number;
    social_sync_at: number | null;
    social_deleted_at: number | null;
  }
  interface MoneyKind {
    money_kind_id: string;
    money_kind_name: string;
    money_kind_type: MoneyType;
    money_kind_ordering: number;
    money_kind_updated_at: number;
    money_kind_sync_at: number | null;
    money_kind_deleted_at: number | null;
  }
  interface Money {
    money_id: string;
    timestamp: number;
    money_value: number;
    money_kind_id: string;
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
    extra_flag: number;
    extra_deleted_at: number | null;
  }

  // --------------------------------------------------------------------------
  // Product aggregate: products + stocks + listings + codes
  // --------------------------------------------------------------------------
  interface Product {
    product_id: string;
    product_name: string;
    product_note: string;
    product_updated_at: number;
    product_sync_at: number | null;
    product_deleted_at: number | null;
  }
  interface Stock {
    stock_id: string;
    product_id: string;
    stock_value: number; // remaining qty, in base pcs
    stock_capital: number; // cost per base pc
    stock_created_at: number; // orders lots for FIFO
    stock_updated_at: number;
  }
  interface Listing {
    listing_id: string;
    product_id: string;
    listing_name: string;
    listing_price: number;
    listing_unit: number; // conversion to base pcs (1 pcs = 1, 1 dozen = 12)
    listing_kind: string; // user-defined label, e.g. "retail" | "wholesale"
    listing_updated_at: number;
  }
  interface Code {
    code_id: string;
    product_id: string;
    listing_id: string | null;
    code_value: string;
    code_kind: CodeKind;
    code_updated_at: number;
  }
  interface ProductEvent {
    product_event_id: string;
    product_event_created_at: number;
    product_event_sync_at: number | null;
    product_event_type: ProductEventEnum;
    product_event_value: number;
    stock_id: string;
  }

  // --------------------------------------------------------------------------
  // Record aggregate: records + record_methods + record_listings
  // + discounts + record_extras
  // --------------------------------------------------------------------------
  interface Record {
    record_id: string;
    record_paid_at: number;
    record_rounding: number;
    record_is_credit: 0 | 1;
    record_cashier: string;
    record_mode: Mode;
    record_pay: number; // cached SUM(record_methods.record_method_pay)
    record_note: string;
    record_fix: number;
    record_customer_name: string;
    record_customer_phone: string;
    record_sub_total: number; // total from record_listings, including discounts
    record_total: number; // total after including extra (excludes rounding)
    record_updated_at: number;
    record_sync_at: number | null;
    record_deleted_at: number | null;
  }
  interface RecordMethod {
    record_method_id: string;
    record_id: string;
    method_id: string;
    record_method_pay: number;
  }
  interface RecordListing {
    record_listing_id: string;
    listing_id: string | null;
    record_id: string;
    record_listing_name: string;
    record_listing_kind: string;
    record_listing_price: number;
    record_listing_qty: number;
    record_listing_capital: number;
    record_listing_total: number;
  }
  interface Discount {
    discount_id: string;
    record_listing_id: string;
    discount_value: number;
    discount_eff: number;
    discount_kind: DiscKind;
  }
  interface RecordExtra {
    record_extra_id: string;
    record_extra_name: string;
    record_id: string;
    record_extra_value: number;
    record_extra_eff: number;
    record_extra_kind: ValueKind;
  }
}
