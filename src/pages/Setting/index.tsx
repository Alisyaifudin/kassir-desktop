import { RouteObject } from "react-router";
import { Button } from "../../components/ui/button";
import { useStore } from "../../Layout";
import { useState } from "react";
import { Input } from "../../components/ui/input";
import { setSetting, useSetting } from "./setting-api";
import { Loader2 } from "lucide-react";
import { Await } from "../../components/Await";
import { Store } from "../../store";

export const route: RouteObject = {
	path: "setting",
	children: [{ index: true, Component: Page }],
};

export default function Page() {
	const setting = useSetting();
	return <Await state={setting}>{(setting) => <Setting {...setting} />}</Await>;
}

function Setting({ owner, address, ig, tiktok, wa }: Partial<Record<keyof Store, string>>) {
	const store = useStore();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		setSetting(store, {
			owner: (formData.get("owner") as string) ?? undefined,
			address: (formData.get("address") as string) ?? undefined,
			wa: (formData.get("wa") as string) ?? undefined,
			ig: (formData.get("ig") as string) ?? undefined,
			tiktok: (formData.get("tiktok") as string) ?? undefined,
		})
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
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>Nama Toko</span>
					:
					<Input type="text" defaultValue={owner} name="owner" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>Alamat</span>
					:
					<Input type="text" defaultValue={address} name="address" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr]  items-center gap-1">
					<span>WA</span>
					:
					<Input type="text" defaultValue={wa} name="wa" pattern="\d*" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>Instagram</span>
					:
					<Input type="text" defaultValue={ig} name="ig" />
				</label>
				<label className="grid grid-cols-[100px_1px_1fr] items-center gap-1">
					<span>TikTok</span>
					:
					<Input type="text" defaultValue={tiktok} name="tiktok" />
				</label>
				<Button>Simpan {loading && <Loader2 className="animate-spin" />}</Button>
				{error === "" ? null : <p className="text-red-500">{error}</p>}
			</form>
		</main>
	);
}
