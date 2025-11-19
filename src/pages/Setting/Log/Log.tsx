import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { useLog } from "./_hooks/use-log";
import { useClear } from "./_hooks/use-clear";
import { Async } from "~/components/Async";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const localStyle = {
	big: {
		fontSize: "20px",
		lineHeight: 1.4,
	},
	small: {
		fontSize: "14px",
		lineHeight: 1.2,
	},
};

export default function Page({ logPath, toast }: { logPath: string; toast: (v: string) => void }) {
	const [state, revalidate] = useLog(logPath);
	const { loading, handleClear } = useClear(logPath, revalidate, toast);
	const size = useSize();
	return (
		<div className="flex flex-col gap-2 flex-1 text-3xl overflow-hidden">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold">Log</h1>
				<Button style={style[size].text} variant="destructive" onClick={handleClear}>
					<Spinner when={loading} />
					Bersihkan
				</Button>
			</div>
			<div className="flex flex-col gap-1 bg-black h-full overflow-auto">
				<Async state={state}>
					{(data) =>
						data.map((t, i) => (
							<p style={localStyle[size]} className="text-white" key={i}>
								{t}
							</p>
						))
					}
				</Async>
			</div>
		</div>
	);
}
