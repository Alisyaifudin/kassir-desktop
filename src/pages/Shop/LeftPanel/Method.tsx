import { z } from "zod";
import { Await } from "~/components/Await";
import { useAsync } from "~/hooks/useAsync";
import { Method as MethodEnum, METHOD_NAMES, METHODS } from "~/lib/utils";
import { useDB } from "~/RootLayout";

export function Method({
	mode,
	method,
	setMethod,
	methodType,
	setMethodType,
}: {
	mode: "sell" | "buy";
	method: MethodEnum;
	setMethod: (mode: "sell" | "buy", method: MethodEnum) => void;
	methodType: string | null;
	setMethodType: (mode: "sell" | "buy", methodType: string | null) => void;
}) {
	const state = useMethods();
	const handleChangeMethod = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const val = e.currentTarget.value;
		const parsed = z.enum(METHODS).safeParse(val);
		const method = parsed.success ? parsed.data : "cash";
		setMethod(mode, method);
	};
	const handleChangeMethodType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		let val: string | null = e.currentTarget.value;
		if (val === "null") {
			val = null;
		}
		setMethodType(mode, val);
	};
	return (
		<Await state={state}>
			{(raw) => {
				const methods = raw.filter((r) => r.method === method);
				return (
					<div className="flex items-center gap-3 text-3xl">
						<select value={method} onChange={handleChangeMethod} className=" w-[200px] outline">
							{METHODS.map((m) => (
								<option key={m} value={m}>
									{METHOD_NAMES[m]}
								</option>
							))}
						</select>
						{methods.length > 0 ? (
							<select
								value={methodType ?? "null"}
								onChange={handleChangeMethodType}
								className=" w-[200px] outline"
							>
								<option value="null">--Pilih--</option>
								{methods.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name}
									</option>
								))}
							</select>
						) : <div className="w-[200px]" />}
					</div>
				);
			}}
		</Await>
	);
}

function useMethods() {
	const db = useDB();
	const state = useAsync(() => db.method.get());
	return state;
}
