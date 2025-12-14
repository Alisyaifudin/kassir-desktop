import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

export function Spinner({ when, className }: { when: boolean; className?: string }) {
	if (!when) return null;
	return <Loader2 className={cn("animate-spin icon", className)} />;
}
