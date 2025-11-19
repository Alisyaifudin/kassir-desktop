import { Loader2 } from "lucide-react";

export function Spinner({ when, size }: { when: boolean; size?: number }) {
	if (!when) return null;
	return <Loader2 size={size} className="animate-spin" />;
}
