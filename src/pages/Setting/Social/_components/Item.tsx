import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useEdit } from "../_hooks/use-edit";
import { Either } from "~/components/Either";
import { memo } from "react";
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const grid = {
	big: {
		gridTemplateColumns: "250px 1fr 60px",
	},
	small: {
		gridTemplateColumns: "200px 1fr 30px",
	},
};

export const Item = memo(function ({
	id,
	name,
	value,
	revalidate,
	db,
}: {
	id: number;
	name: string;
	value: string;
	revalidate: () => void;
	db: Database;
}) {
	const { loading, handleSubmit, error } = useEdit(id, revalidate, db);
	const size = useSize();
	return (
		<form onSubmit={handleSubmit} style={grid[size]} className="grid  gap-2 items-center">
			<Input
				style={style[size].text}
				name="name"
				defaultValue={name}
				placeholder="Nama Kontak"
				aria-autocomplete="list"
			/>
			<Input
				style={style[size].text}
				name="value"
				defaultValue={value}
				placeholder="Isian Kontak"
				aria-autocomplete="list"
			/>
			<button type="submit" className="hidden">
				Submit
			</button>
			<Either
				if={loading}
				then={<Loader2 className="animate-spin" size={style[size].icon} />}
				else={<DeleteBtn id={id} name={name} value={value} revalidate={revalidate} db={db} />}
			/>
			<TextError style={style[size].text} className="col-span-2">
				{error?.global}
			</TextError>
			<TextError style={style[size].text}>{error?.name}</TextError>
			<TextError style={style[size].text}>{error?.value}</TextError>
		</form>
	);
});
