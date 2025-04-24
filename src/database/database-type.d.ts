declare namespace DB {
	interface Product {
		id: number;
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
	}
	interface Record {
		timestamp: number; // primary key
		total: number;
		pay: number;
		variant: "buy" | "sell";
		disc_val: number | null;
		disc_type: "number" | "percent" | null;
		change: string;
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
		disc_val: number | null;
		disc_type: "number" | "percent" | null;
		capital: number | null;
	}
}
