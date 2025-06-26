declare namespace DB {
	interface Product {
		id: number;
		name: string;
		price: number;
		stock: number;
		barcode: string | null;
		capital: number;
		note: string;
	}
	interface Record {
		timestamp: number; // primary key
		// paid_at: number;
		total_before_disc: number;
		disc_val: number;
		disc_type: "number" | "percent";
		total_after_disc: number;
		total_tax: number;
		total_after_tax: number;
		rounding: number | null;
		grand_total: number;
		credit: 0 | 1;
		cashier: string | null;
		mode: "buy" | "sell";
		pay: number;
		change: number;
		method: "cash" | "transfer" | "debit" | "qris" | "other";
		method_type: number | null;
		note: string;
	}
	interface Additional {
		id: number;
		name: string;
		timestamp: number;
		value: number;
		kind: "number" | "percent";
	}
	interface Discount {
		id: number;
		record_item_id: number;
		value: number;
		kind: "number" | "percent";
	}
	interface RecordItem {
		id: number;
		timestamp: number;
		name: string;
		price: number;
		qty: number;
		total_before_disc: number;
		total: number;
		capital: number;
		product_id: number | null;
	}
	interface Cashier {
		name: string;
		role: "user" | "admin";
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
	interface Method {
		name: "cash" | "transfer" | "debit" | "qris" | "other";
	}
	interface MethodType {
		id: number;
		name: string;
		method: "cash" | "transfer" | "debit" | "qris" | "other";
	}
	type Role = "admin" | "user";
}
