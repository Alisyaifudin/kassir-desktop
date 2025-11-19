import { memo } from "react";
import { Store } from "~/lib/store";
import { useCheckbox } from "../_hooks/use-checkbox";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const CheckboxForm = memo(function ({
	context,
	showCashier,
}: {
	showCashier: boolean;
	context: { store: Store };
}) {
	const { loading, error, handleChangeShowCashier } = useCheckbox(context);
	const size = useSize();
	return (
		<>
			<Label style={style[size].text} className="flex items-center gap-3">
				<span>Tampilkan Nama Kasir</span>
				<Checkbox defaultChecked={showCashier} onCheckedChange={handleChangeShowCashier} />
				<Spinner size={style[size].icon} when={loading} />
			</Label>
			<TextError style={style[size].text}>{error}</TextError>
		</>
	);
});
