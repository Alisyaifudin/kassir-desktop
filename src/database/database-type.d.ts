declare namespace DB {
	type Role = "admin" | "user";
	type ValueKind = "number" | "percent";
	type Mode = "sell" | "buy";
	type MethodEnum = "cash" | "transfer" | "debit" | "qris";

	interface Method {
		id: number;
		name: string | null;
		method: MethodEnum;
	}
	interface Product {
		id: number;
		name: string;
		price: number;
		stock: number;
		stock_back: number;
		barcode: string | null;
		capital: number;
		note: string;
		updated_at: number;
	}
	interface Record {
		timestamp: number; // primary key
		paid_at: number;
		disc_val: number;
		disc_kind: ValueKind;
		rounding: number | null;
		credit: 0 | 1;
		cashier: string;
		mode: Mode;
		pay: number;
		note: string;
		method_id: number;
	}
	interface RecordItem {
		id: number;
		product_id: number | null;
		timestamp: number;
		name: string;
		price: number;
		qty: number;
		capital: number;
	}
	interface Additional {
		id: number;
		name: string;
		timestamp: number;
		value: number;
		kind: ValueKind;
	}
	interface Discount {
		id: number;
		record_item_id: number;
		value: number;
		kind: ValueKind;
	}
	
	interface Cashier {
		name: string;
		role: Role;
		password: string;
	}
	interface Image {
		id: number;
		name: string;
		mime: "image/png" | "image/jpeg";
		product_id: number;
	}
	interface Social {
		name: string;
		id: number;
		value: string;
	}
	interface Money {
		timestamp: number;
		value: number;
		kind: "saving" | "debt" | "diff";
	}
}
