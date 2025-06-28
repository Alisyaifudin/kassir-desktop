import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { CashierWithoutPassword } from "~/database/cashier";
import { DeleteBtn } from "./DeleteBtn";
import { useUpdateName } from "../_hooks/use-update-name";
import { useUpdateRole } from "../_hooks/use-update-role";
import { Spinner } from "~/components/Spinner";

export function Item({ cashier, username }: { cashier: CashierWithoutPassword; username: string }) {
	const name = useUpdateName(cashier.name);
	const role = useUpdateRole(cashier.name);
	if (username === cashier.name) {
		return (
			<div className="flex items-center justify-between pr-22">
				<p className="text-2xl pl-3">{username}</p>
				<p className="text-3xl">{title[cashier.role]}</p>
			</div>
		);
	}
	return (
		<form onSubmit={name.handleSubmit} className="flex items-center gap-3">
			<Input type="text" defaultValue={cashier.name} name="name" aria-autocomplete="list" />
			<Spinner when={name.loading} />
			<TextError>{name.error}</TextError>
			<select value={cashier.role} onChange={role.handleChangeRole} className="text-3xl">
				<option value="admin">Admin</option>
				<option value="user">User</option>
			</select>
			<DeleteBtn name={cashier.name} />
		</form>
	);
}

const title = {
	admin: "Admin",
	user: "User",
};
