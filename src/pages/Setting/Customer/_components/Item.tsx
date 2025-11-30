import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { DeleteBtn } from "./DeleteBtn";
import { useUpdateName } from "../_hooks/use-update-name";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { memo } from "react";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const Item = memo(function ({
	customer,
	revalidate,
	db,
}: {
	customer: DB.Customer;
	db: Database;
	revalidate: () => void;
}) {
	const name = useUpdateName(customer.phone, db);
	const size = useSize();
	return (
		<form onSubmit={name.handleSubmit} className="flex items-center gap-3">
			<Input
				style={style[size].text}
				type="text"
				defaultValue={customer.name}
				name="name"
				aria-autocomplete="list"
			/>
			<p style={style[size].text}>{customer.phone}</p>
			<Spinner when={name.loading} />
			<TextError>{name.error}</TextError>
			<DeleteBtn name={customer.name} phone={customer.phone} db={db} revalidate={revalidate} />
		</form>
	);
});
