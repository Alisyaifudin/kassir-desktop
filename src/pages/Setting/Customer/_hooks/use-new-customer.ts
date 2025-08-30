import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";

export function useNewCustomer(
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { action, loading, error, setError } = useAction(
		"",
		async (input: { name: string; phone: string }) => {
			return db.customer.add.one(input.phone, input.name);
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				name: z.string().min(1),
				phone: z.string().min(1),
			})
			.safeParse({
				name: formData.get("name"),
				phone: formData.get("phone"),
			});
		console.log(parsed)
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
