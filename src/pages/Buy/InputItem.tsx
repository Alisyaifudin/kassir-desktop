import { Manual } from "./Manual";
import { Search } from "./Search";
import { Barcode } from "./Barcode";

export function InputItem() {
	return (
		<aside className="flex flex-col gap-2 h-full w-[400px]">
			<Barcode />
			<hr />
			<Search />
			<hr />
			<Manual />
		</aside>
	);
}
