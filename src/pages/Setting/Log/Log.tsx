import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { useLog } from "./_hooks/use-log";
import { useClear } from "./_hooks/use-clear";
import { Async } from "~/components/Async";

export default function Page({ logPath, toast }: { logPath: string; toast: (v: string) => void }) {
	const [state, revalidate] = useLog(logPath);
	const { loading, handleClear } = useClear(logPath, revalidate, toast);
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl overflow-hidden">
			<div className="flex justify-between items-center">
				<h1 className="text-4xl font-bold">Log</h1>
				<Button variant="destructive" onClick={handleClear}>
					<Spinner when={loading} />
					Bersihkan
				</Button>
			</div>
			<div className="flex flex-col gap-1 bg-black h-full overflow-auto">
				<Async state={state}>
					{(data) =>
						data.map((t, i) => (
							<p className="text-xl text-white" key={i}>
								{t}
							</p>
						))
					}
				</Async>
			</div>
		</div>
	);
}
