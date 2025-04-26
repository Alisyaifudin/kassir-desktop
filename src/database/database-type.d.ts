declare namespace DB {
	interface Product {
		id: number;
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
		capital: number;
	}
	interface Record {
		timestamp: number; // primary key
		total: number;
		grand_total: number;
		pay: number;
		mode: "buy" | "sell";
		disc_val: number;
		disc_type: "number" | "percent";
		change: string;
		rounding: number | null;
	}
	interface Tax {
		id: number;
		name: string;
		timestamp: number;
		value: number; // in percentage
	}
	interface RecordItem {
		id: number;
		timestamp: number;
		name: string;
		price: number;
		qty: number;
		subtotal: number;
		disc_val: number;
		disc_type: "number" | "percent";
		capital: number | null;
	}
}
