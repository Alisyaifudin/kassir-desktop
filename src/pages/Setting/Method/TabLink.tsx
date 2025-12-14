import { memo } from "react";
import { Button } from "~/components/ui/button";
import { METHOD_NAMES, METHODS } from "~/lib/utils";
import { useMethod } from "./use-method";

export const TabLink = memo(function () {
	const [method, setMethod] = useMethod();
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
});
