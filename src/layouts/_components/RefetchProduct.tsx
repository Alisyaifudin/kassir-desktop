import { RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Size } from "~/hooks/use-size";
import { style } from "~/lib/style";

const liHeight = {
	big: {
		height: "48px",
	},
	small: {
		height: "40px",
	},
};

export function RefetchProduct({ size }: { size: Size }) {
	return (
		<li style={liHeight[size]}>
			<Button
				size="icon"
				className="rounded-full"
				onClick={() => window.location.reload()}
				variant="ghost"
			>
				<RefreshCcw size={style[size].icon} />
			</Button>
		</li>
	);
}
