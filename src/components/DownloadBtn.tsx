import { Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useDownload } from "~/hooks/use-download";
import { Show } from "./Show";

export function DownloadBtn({ connected }: { connected: boolean }) {
	const { handleClick, loading } = useDownload();
	return (
		<Button
			onClick={handleClick}
			size="icon"
			disabled={!connected}
			variant="outline"
			className="rounded-full"
		>
			<Show when={!loading} fallback={<Loader2 className="animate-spin" />}>
				<Download />
			</Show>
		</Button>
	);
}
