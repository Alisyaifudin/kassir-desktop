import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { useUpdateName } from "../_hooks/use-update-name";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { memo } from "react";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const Item = memo(function ({
	method,
	db,
	revalidate,
}: {
	method: DB.Method;
	revalidate: () => void;
	db: Database;
}) {
	const { loading, error, handleSubmit } = useUpdateName(method, revalidate, db);
	const size = useSize();
	if (method.name === null) {
		throw new Error("Nama metode harus ada");
	}
	return (
		<>
			<div className="flex items-center gap-1 w-full">
				<form onSubmit={handleSubmit} className="flex item-center gap-1 w-full">
					<Input
						style={style[size].text}
						className="w-full"
						name="name"
						defaultValue={method.name}
						aria-autocomplete="list"
					/>
					<Spinner when={loading} />
				</form>
				<DeleteBtn method={method} db={db} revalidate={revalidate} />
			</div>
			<TextError>{error}</TextError>
		</>
	);
});
