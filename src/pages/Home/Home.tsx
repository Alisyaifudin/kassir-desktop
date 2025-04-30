import { LeftPanel } from "./LeftPanel";
import { z } from "zod";
import { RightPanel } from "./RightPanel";
import { useEffect, useState } from "react";
import { dataSchema, useData } from "./data";
import { log } from "../../lib/utils";
import { Loader2 } from "lucide-react";

function Layout({ children }: { children: React.ReactNode }) {
	return <main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">{children}</main>;
}

export default function Page() {
	const { loading, error } = useLoadData();
	if (error) {
		log.error(String(error));
		return (
			<Layout>
				<p>Ada yang bermasalah</p>
			</Layout>
		);
	}
	return (
		<Layout>
			{loading ? (
				<Loader2 className="animate-splin" />
			) : (
				<>
					<LeftPanel />
					<RightPanel />
				</>
			)}
		</Layout>
	);
}

export function getMode(search: URLSearchParams): "sell" | "buy" {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}

type LoadData =
	| { loading: true; error: null }
	| { loading: false; error: null }
	| { loading: false; error: any };

function useLoadData(): LoadData {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<any>(null);
	const setInitial = useData((state) => state.setInitial);
	useEffect(() => {
		if (!window) {
			setError("Tidak ada window?");
			setLoading(false);
			return;
		}
		const localData = window.localStorage.getItem("home-data");
		if (localData === null) {
			setLoading(false);
			return;
		}
		try {
			var jsonData = JSON.parse(localData);
		} catch (error) {
			setLoading(false);
			return;
		}
		const parsed = dataSchema.safeParse(jsonData);
		if (!parsed.success) {
			setLoading(false);
			return;
		}
		setInitial(parsed.data);
		setLoading(false);
	}, []);
	return { loading, error };
}
