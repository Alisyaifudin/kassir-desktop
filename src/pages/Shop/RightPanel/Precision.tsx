import { useFix } from "~/pages/Shop/use-fix";

export function Precision() {
	const [fix, setFix] = useFix();
	return (
		<div>
			<label className="flex items-center gap-3 pr-5">
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
