import { METHOD_NAMES } from "~/lib/utils";

export function Footer({
	footers,
	socials,
	totalProductTypes,
	totalQty,
	method,
}: {
	footers: string[];
	socials: DB.Social[];
	totalProductTypes: number;
	totalQty: number;
	method: DB.Method;
}) {
	return (
		<>
			<div className="flex justify-between">
				<p>
					{totalProductTypes} Jenis/{totalQty} pcs
				</p>
				<p className="">
					{METHOD_NAMES[method.method]}
					{method.name === null ? null : " " + method.name}
				</p>
			</div>
			<div className="flex items-center flex-col">
				{footers.map((h, i) => (
					<p className="text-center" key={i}>
						{h}
					</p>
				))}
				{socials.map((s) => (
					<p key={s.id}>
						{s.name}: {s.value}
					</p>
				))}
			</div>
		</>
	);
}
