import { Loader2 } from "lucide-react";

export function Spinner({ when }: { when: boolean }) {
	if (!when) return null;
	return <Loader2 className="animate-spin" />;
}
