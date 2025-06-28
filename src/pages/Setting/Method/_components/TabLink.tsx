import { Button } from "~/components/ui/button";
import { METHOD_NAMES, METHODS } from "~/lib/utils";

export function TabLink({
	method,
	setMethod,
}: {
	method: DB.MethodEnum;
	setMethod: (method: DB.MethodEnum) => void;
}) {
	return (
		<ol className="flex items-cente gap-1">
			{METHODS.filter((m) => m !== "cash").map((m) => (
				<li key={m}>
					<Button onClick={() => setMethod(m)} variant={method === m ? "default" : "link"}>
						{METHOD_NAMES[m]}
					</Button>
				</li>
			))}
		</ol>
	);
}
