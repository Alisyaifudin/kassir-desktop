import { z } from "zod";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

export function Mode({
	mode,
	setMode,
}: {
	mode: "sell" | "buy";
	setMode: (mode: "sell" | "buy") => void;
}) {
	return (
		<div className="flex items-center gap-7">
			<RadioGroup
				value={mode}
				className="flex items-center gap-5"
				onValueChange={(v) => {
					const parsed = z.enum(["sell", "buy"]).safeParse(v);
					setMode(parsed.success ? parsed.data : "sell");
				}}
			>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="sell" id="sell" />
					<Label htmlFor="sell">Jual</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="buy" id="buy" />
					<Label htmlFor="buy">Beli</Label>
				</div>
			</RadioGroup>
		</div>
	);
}
