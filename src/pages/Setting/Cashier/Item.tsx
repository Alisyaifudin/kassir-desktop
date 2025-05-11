import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useDB } from "~/RootLayout";
import { z } from "zod";
import { CashierWithoutPassword } from "~/database/cashier";
import { useAction } from "~/hooks/useAction";
import { DeleteBtn } from "./DeleteBtn";
import { emitter } from "~/lib/event-emitter";

export function Item({ cashier, username }: { cashier: CashierWithoutPassword; username: string }) {
	const { name, role } = useActions();
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.object({ newName: z.string() }).safeParse({ newName: formData.get("name") });
		if (!parsed.success) {
			name.setError(parsed.error.flatten().fieldErrors.newName?.join("; ") ?? "Ada yang salah");
			return;
		}
		const { newName } = parsed.data;
		const errMsg = await name.action({ old: cashier.name, new: newName });
		name.setError(errMsg);
	};
	const handleChangeRole = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["admin", "user"]).safeParse(e.currentTarget.value);
		if (!parsed.success) {
			role.setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newRole = parsed.data;
		const errMsg = await role.action({ name: cashier.name, role: newRole });
		role.setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-cashiers");
		}
	};
	if (username === cashier.name) {
		return (
			<div className="flex items-center justify-between pr-22">
				<p className="text-2xl pl-3">{username}</p>
				<p className="text-3xl">{title[cashier.role]}</p>
			</div>
		);
	}
	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-3">
			<Input type="text" defaultValue={cashier.name} name="name" />
			{name.loading ? <Loader2 className="animate-spin" /> : null}
			{name.error ? <TextError>{name.error}</TextError> : null}
			<select value={cashier.role} onChange={handleChangeRole} className="text-3xl">
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

function useActions() {
	const db = useDB();
	const name = useAction("", (name: { old: string; new: string }) => {
		return db.cashier.updateName(name.old, name.new);
	});
	const role = useAction("", (cashier: { name: string; role: "admin" | "user" }) => {
		return db.cashier.updateRole(cashier.name, cashier.role);
	});
	return { name, role };
}
