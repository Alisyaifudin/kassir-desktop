import { Await } from "~/components/Await";
import { Button } from "~/components/ui/button";
import { useLog } from "./_hooks/use-log";
import { useClear } from "./_hooks/use-clear";
import { Spinner } from "~/components/Spinner";

export default function Page() {
	const state = useLog();
	const { loading, handleClear } = useClear();
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
				<Await state={state}>
					{(data) =>
						data.map((t, i) => (
							<p className="text-xl text-white" key={i}>
								{t}
							</p>
						))
					}
				</Await>
			</div>
		</div>
	);
}
