declare namespace DB {
	interface Product {
		id: number;
		name: string;
		price: number;
		stock: number;
		barcode: string | null;
		capital: number;
	}
	interface Record {
		timestamp: number; // primary key
		total_before_disc: number;
		disc_val: number;
		disc_type: "number" | "percent";
		total_after_disc: number;
		total_tax: number;
		total_after_tax: number;
		rounding: number | null;
		grand_total: number;credit: 0 | 1;
		cashier: string | null;
		mode: "buy" | "sell";
		pay: number;
		change: number;
		method: "cash" | "transfer" | "emoney",
  	note: string;
	}
	interface Tax {
		id: number;
		name: string;
		timestamp: number;
		percent: number;
		value: number;
	}
	interface RecordItem {
		id: number;
		timestamp: number;
		name: string;
		price: number;
		qty: number;
		total_before_disc: number;
		disc_val: number;
		disc_type: "number" | "percent";
		capital: number;
	}
	interface Cashier {
		name: string;
	}
}
