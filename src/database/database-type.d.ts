declare namespace DB {
  type Role = "admin" | "user";
  type ValueKind = "number" | "percent";
  type DiscKind = ValueKind | "pcs";
  type Mode = "incoming" | "outcoming";
  type MoneyType = "absolute" | "change";
  type MethodEnum = "cash" | "transfer" | "debit" | "qris";
  type Mime = "image/png" | "image/jpeg";
  type CodeKind = "barcode" | "qr";

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
  interface Pocket {
    pocket_id: string;
    pocket_name: string;
    pocket_type: MoneyType;
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
  // Product aggregate: products + stocks + listings
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
    // local cache of `product_events`; NOT synced (no sync_at / deleted_at)
  }
  interface Listing {
    listing_id: string;
    product_id: string;
    listing_name: string;
    listing_price: number;
    listing_unit: number; // conversion to base pcs (1 pcs = 1, 1 dozen = 12)
    listing_kind: string; // user-defined label, e.g. "retail" | "wholesale"
    listing_code: string | null; // at most one code per listing
    listing_code_kind: CodeKind | null; // "barcode" | "qr"; null when no code
    listing_updated_at: number;
    listing_sync_at: number | null;
    listing_deleted_at: number | null;
  }
  interface ProductEvent {
    product_event_id: string;
    product_event_created_at: number;
    product_event_sync_at: number | null;
    product_event_value: number; // signed delta (+/-/0)
    product_event_capital: number; // the lot's capital as of this event (NOT NULL)
    product_id: string;
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

  // --------------------------------------------------------------------------
  // Cart aggregate (ported from tx.db into data.db):
  // tx_records + tx_methods + tx_listings + tx_discounts + tx_extras
  // --------------------------------------------------------------------------
  interface TxRecord {
    tx_record_id: string;
    tx_record_order: number; // user-controlled tab order; re-arrangeable, not unique
    tx_record_flag: number; // local flag (role TBD)
    tx_record_title: string;
    tx_record_mode: Mode;
    tx_record_query: string;
    tx_record_fix: number;
    tx_record_note: string;
    tx_record_customer_id: string | null;
    tx_record_manual_code: string;
    tx_record_manual_name: string;
    tx_record_manual_price: number;
    tx_record_manual_qty: number;
  }
  interface TxMethod {
    tx_record_id: string; // PK part 1
    method_id: string; // PK part 2, references methods(method_id)
    tx_method_value: number;
  }
  interface TxListing {
    tx_listing_id: string;
    tx_record_id: string;
    listing_id: string | null; // live catalog ref (ON DELETE SET NULL)
    tx_listing_name: string;
    tx_listing_price: number;
    tx_listing_unit: number; // conversion to base pcs
    tx_listing_qty: number;
    tx_listing_kind: string; // e.g. "retail" | "wholesale"
  }
  interface TxDiscount {
    tx_disc_order: number;
    tx_disc_id: string;
    tx_listing_id: string;
    tx_disc_value: number;
    tx_disc_eff: number;
    tx_disc_kind: DiscKind;
  }
  interface TxExtra {
    tx_extra_order: number;
    tx_extra_id: string;
    tx_record_id: string;
    tx_extra_kind: ValueKind;
    tx_extra_name: string;
    tx_extra_value: number;
    tx_extra_eff: number;
  }
}
