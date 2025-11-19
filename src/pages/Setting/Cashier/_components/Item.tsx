import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { CashierWithoutPassword } from "~/database/cashier";
import { DeleteBtn } from "./DeleteBtn";
import { useUpdateName } from "../_hooks/use-update-name";
import { useUpdateRole } from "../_hooks/use-update-role";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { memo } from "react";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const Item = memo(function ({
	cashier,
	username,
	revalidate,
	db,
}: {
	cashier: CashierWithoutPassword;
	username: string;
	db: Database;
	revalidate: () => void;
}) {
	const name = useUpdateName(cashier.name, db);
	const role = useUpdateRole(cashier.name, revalidate, db);
	const size = useSize();
	if (username === cashier.name) {
		return (
			<div className="flex items-center justify-between pr-17">
				<p style={style[size].text} className=" pl-3">
					{username}
				</p>
				<p style={style[size].text} className="text-3xl">
					{title[cashier.role]}
				</p>
			</div>
		);
	}
	return (
		<form onSubmit={name.handleSubmit} className="flex items-center gap-3">
			<Input
				style={style[size].text}
				type="text"
				defaultValue={cashier.name}
				name="name"
				aria-autocomplete="list"
			/>
			<Spinner when={name.loading} />
			<TextError>{name.error}</TextError>
			<select style={style[size].text} value={cashier.role} onChange={role.handleChangeRole}>
				<option value="admin">Admin</option>
				<option value="user">User</option>
			</select>
			<DeleteBtn name={cashier.name} db={db} revalidate={revalidate} />
		</form>
	);
});

const title = {
	admin: "Admin",
	user: "User",
};
