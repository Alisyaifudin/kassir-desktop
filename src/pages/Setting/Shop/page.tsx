import { CashierCheckbox } from "./CashierCheckbox";
import { SelectSize } from "./SelectSize";
import { Info } from "./Info";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";

export default function Shop() {
	const { header, address, footer, owner, showCashier, size } = useLoaderData<Loader>();

	return (
		<div className="flex flex-col gap-2 flex-1 w-full overflow-auto pb-3">
			<Info owner={owner} address={address} header={header} footer={footer} />
			<CashierCheckbox showCashier={showCashier} />
			<SelectSize size={size} />
		</div>
	);
}
