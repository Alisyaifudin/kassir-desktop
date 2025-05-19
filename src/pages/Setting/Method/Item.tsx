import { Loader2 } from "lucide-react";
import React from "react";
import { z } from "zod";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useAction } from "~/hooks/useAction";
import { useDB } from "~/RootLayout";
import { DeleteBtn } from "./DeleteBtn";

export function Item({ method }: { method: DB.MethodType }) {
	const db = useDB();
	const { action, error, loading, setError } = useAction("", (name: string) =>
		db.method.update(method.id, name)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().min(1, { message: "Harus ada" }).safeParse(formData.get("name"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const name = parsed.data;
		const errMsg = await action(name);
		setError(errMsg);
	};
	return (
		<>
			<div className="flex items-center gap-1 w-full">
				<form onSubmit={handleSubmit} className="flex item-center gap-1 w-full">
					<Input className="w-full" name="name" defaultValue={method.name} aria-autocomplete="list" />
          {loading ? <Loader2 className="animate-spin" /> : null}
				</form>
        <DeleteBtn method={method} />
			</div>
			{error ? <TextError>{error}</TextError> : null}
		</>
	);
}
