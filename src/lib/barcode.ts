import { err, log, ok, Result } from "./utils";

function toArray(num: number): number[] {
	const arr: number[] = [];
	while (num > 0) {
		const lastDigit = num % 10;
		arr.push(lastDigit);
		num = Math.floor(num / 10);
	}
	arr.reverse();
	return arr;
}

export function ean13(num: number): Result<"Format salah", number> {
	const nums = toArray(num);
	if (nums.length !== 12) {
		log.error("Jumlah digit bukan 12: " + nums.length.toString());
		return err("Format salah");
	}
	const evens: number[] = [];
	const odds: number[] = [];
	nums.forEach((n, i) => {
		if ((i & 1) === 1) {
			evens.push(n);
		} else {
			odds.push(n);
		}
	});
	const firstStep = evens.reduce((prev, curr) => prev + curr) * 3;
	const secondStep = odds.reduce((prev, curr) => prev + curr) + firstStep;
	const thirdStep = secondStep % 10;
	if (thirdStep === 0) {
		return ok(thirdStep);
	}
	return ok(10 - thirdStep);
}

export function genBarcode(num: number): number {
	const base = 212345600000;
	const [errMsg, checkSum] = ean13(base + num);
	if (errMsg) {
		throw new Error(errMsg);
	}
	return checkSum + (base + num) * 10;
}

export function findNextBarcode(barcodes: number[]): number {
	let b = 0;
	for (const barcode of barcodes) {
		if (b !== barcode) {
			return b;
		}
		b += 1;
	}
	return b;
}
