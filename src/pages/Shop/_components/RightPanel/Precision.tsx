import { useFix } from "../../_hooks/use-fix";
import { LocalContext } from "../../_hooks/use-local-state";

export function Precision({ context }: { context: LocalContext }) {
	const [fix, setFix] = useFix(context);
	return (
		<div>
			<label className="text-2xl flex items-center gap-3 pr-5">
				Bulatkan?
				<select value={fix} onChange={(e) => setFix(Number(e.currentTarget.value))}>
					<option value={0}>0</option>
					<option value={1}>1</option>
					<option value={2}>2</option>
					<option value={3}>3</option>
					<option value={4}>4</option>
					<option value={5}>5</option>
				</select>
			</label>
		</div>
	);
}
