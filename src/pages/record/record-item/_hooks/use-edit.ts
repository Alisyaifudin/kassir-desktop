export function useEdit() {
	const [meth, setMeth] = useState<{
		method: Method;
		type: number | null;
	}>({
		method: record.method,
		type: record.method_type,
	});
	const db = useDB();
	const { action, error, loading, setError } = useAction(
		"",
		(data: { note: string; method: Method; methodType: number | null }) =>
			db.record.updateNoteAndMethod(record.timestamp, data.note, data.method, data.methodType)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("note"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join("; "));
			return;
		}
		setError(null);
		const errMsg = await action({ note: parsed.data, method: meth.method, methodType: meth.type });
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-record-item");
			setIsEdit(false);
		}
	};
	const handleChangeMethod = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(METHODS).safeParse(e.currentTarget.value);
		const method = parsed.success ? parsed.data : "cash";
		if (method === meth.method) {
			return;
		}
		setMeth({
			type: null,
			method,
		});
	};
	const handleChangeMethodType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z
			.string()
			.refine((val) => val === "null" || (val !== "" && !isNaN(Number(val))), {
				message: "Harus angka",
			})
			.transform((v) => {
				if (v === "null") {
					return null;
				}
				return Number(v);
			})
			.safeParse(e.currentTarget.value);
		const methodType = parsed.success ? parsed.data : null;
		setMeth({
			type: methodType,
			method: meth.method,
		});
	};
}
