import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { log } from "~/lib/utils";
import { setProfile } from "./utils";
import { Store } from "~/lib/store";

const schema = z.object({
	owner: z.string(),
	header: z.string(),
	footer: z.string(),
	address: z.string(),
});

export function useEdit(refetchName: () => void, context: { store: Store }) {
	const store = context.store;
	const { loading, error, setError, action } = useAction(
		"",
		async (data: z.infer<typeof schema>) => {
			await setProfile(store.profile, data);
			return null;
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = schema.safeParse({
			owner: formData.get("owner"),
			header: formData.get("header"),
			footer: formData.get("footer"),
			address: formData.get("address"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			log.error(JSON.stringify(errs));
			setError("Ada yang invalid. Cek lagi.");
			return;
		}
		await action(parsed.data);
		refetchName();
	};
	return { loading, error, handleSubmit };
}
