import { memo } from "react";
import { Button } from "~/components/ui/button";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";
import { METHOD_NAMES, METHODS } from "~/lib/utils";

export const TabLink = memo(function ({
	method,
	setMethod,
}: {
	method: DB.MethodEnum;
	setMethod: (method: DB.MethodEnum) => void;
}) {
	const size = useSize();
	return (
		<ol className="flex items-cente gap-1">
			{METHODS.filter((m) => m !== "cash").map((m) => (
				<li key={m}>
					<Button style={style[size].text} onClick={() => setMethod(m)} variant={method === m ? "default" : "link"}>
						{METHOD_NAMES[m]}
					</Button>
				</li>
			))}
		</ol>
	);
});
