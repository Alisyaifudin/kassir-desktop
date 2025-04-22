import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { Manual } from "./Manual";
import { Search } from "./Search";

export function InputItem() {
	return (
		<aside className="flex flex-col gap-2 h-full w-[400px]">
			<form>
				<Field label="Barcode">
					<Input type="number" />
				</Field>
			</form>
			<hr />
			<Search />
			<hr />
			<div className="flex-1" />
			<hr />
			<Manual />
		</aside>
	);
}
