import { RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";

export function RefetchProduct() {
	return (
		<li className="h-12">
			<Button size="icon" className="rounded-full" onClick={() => window.location.reload()} variant="ghost">
				<RefreshCcw />
			</Button>
		</li>
	);
}
