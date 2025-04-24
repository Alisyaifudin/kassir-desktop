import { Manual } from "./Manual";
import { Search } from "./Search";
import { Barcode } from "./Barcode";
import { TaxField } from "./Tax";

export function InputItem() {
	return (
		<aside className="flex flex-col gap-2 h-full w-[400px]">
			<Barcode />
			<hr />
			<Search />
			<hr />
			<TaxField />
			<hr />
			<Manual />
		</aside>
	);
}
