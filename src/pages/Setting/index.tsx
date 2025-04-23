import { RouteObject } from "react-router";
import { Button } from "../../components/ui/button";
import { useStore } from "../../Layout";
import { useState } from "react";
import { Input } from "../../components/ui/input";
import { setSetting, useSetting } from "./setting-api";
import { Loader2 } from "lucide-react";
import { Await } from "../../components/Await";

export const route: RouteObject = {
	path: "setting",
	children: [{ index: true, Component: Page }],
};

export default function Page() {
	const setting = useSetting();
	return (
		<Await state={setting}>
			{(setting) => <Setting owner={setting.owner} address={setting.address} />}
		</Await>
	);
}

function Setting({ owner, address }: { owner?: string; address?: string }) {
	const store = useStore();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [settingVal, setSettingVal] = useState({ owner, address });
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setSetting(store, settingVal)
			.then(() => {
				setError("");
				setLoading(false);
			})
			.catch(() => {
				setError("Ada yang bermasalah.");
				setLoading(false);
			});
	};
	return (
		<main className="flex flex-col gap-2 p-2 flex-1 w-full max-w-xl mx-auto">
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<label className="grid grid-cols-[100px_1fr] items-center gap-1">
					<span>Nama Toko:</span>
					<Input
						type="text"
						value={settingVal.owner}
						onChange={(e) => setSettingVal({ ...settingVal, owner: e.currentTarget.value })}
					/>
				</label>
				<label className="grid grid-cols-[100px_1fr] items-center gap-1">
					<span>Alamat:</span>
					<Input
						type="text"
						value={settingVal.address}
						onChange={(e) => setSettingVal({ ...settingVal, address: e.currentTarget.value })}
					/>
				</label>
				<Button>Simpan {loading && <Loader2 className="animate-spin" />}</Button>
				{error === "" ? null : <p className="text-red-500">{error}</p>}
			</form>
		</main>
	);
}
