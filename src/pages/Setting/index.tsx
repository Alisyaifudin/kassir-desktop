import { Await, RouteObject } from "react-router";
import { Button } from "../../components/ui/button";
import { useStore } from "../../Layout";
import { Suspense, useState } from "react";
import { Input } from "../../components/ui/input";
import { getSetting } from "./get-setting";
import { Loader2 } from "lucide-react";

export const route: RouteObject = {
	path: "setting",
	children: [{ index: true, Component: Page }],
};

export default function Page() {
	const setting = useSetting();
	return (
		<Suspense fallback={<p>Loading...</p>}>
			<Await resolve={setting}>{(setting) => <Setting owner={setting.owner} />}</Await>
		</Suspense>
	);
}

function Setting({ owner }: { owner?: string }) {
	const store = useStore();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [name, setName] = useState(owner);
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		store
			.set("owner", name)
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
		<main className="flex flex-col gap-2 p-2">
			<form onSubmit={handleSubmit}>
				<label className="flex flex-col gap-1">
					<span>Nama Toko:</span>
					<Input type="text" value={name} onChange={(e) => setName(e.currentTarget.value)} />
					{error === "" ? null : <p className="text-red-500">{error}</p>}
					<Button>Simpan {loading && <Loader2 className="animate-spin" />}</Button>
				</label>
			</form>
		</main>
	);
}

const useSetting = () => {
	const store = useStore();
	const setting = getSetting(store);
	return setting;
};
