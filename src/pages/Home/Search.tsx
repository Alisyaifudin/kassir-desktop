import { Field } from "./Field";
import { Input } from "../../components/ui/input";

export function Search() {
	return (
		<>
			<h2 className="font-bold">Cari</h2>
			<form>
				<Field label="Nama">
					<Input type="text" />
				</Field>
			</form>
		</>
	);
}
