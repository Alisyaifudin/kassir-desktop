import { useStore } from "~/RootLayout";
import { useDisconnect } from "./use-disconnect";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useUpload } from "./use-upload";
import { DeleteBtn } from "./DeleteBtn";

export function Panel({ connected }: { connected: boolean }) {
	const store = useStore();
	const { handleDisconnect, loading } = useDisconnect(store);
	return (
		<div className="flex items-center justify-between gap-2">
			<Show when={connected}>
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-5">
						<p className="text-3xl font-bold">Pengaturan Produk</p>
						<Button type="button" onClick={handleDisconnect} variant="outline">
							<Show when={loading}>
								<Loader2 className="animate-spin" />
							</Show>
							Putuskan
						</Button>
					</div>
					<div className="flex items-center gap-2">
						<Upload />
						<DeleteBtn />
					</div>
				</div>
			</Show>
			<div />
		</div>
	);
}

function Upload() {
	const { error, loading, handleClick } = useUpload();
	return (
		<div className="flex flex-col gap-1">
			<Button type="button" onClick={handleClick}>
				Unggah
				<Show when={loading}>
					<Loader2 className="animate-spin" />
				</Show>
			</Button>
			<Show when={error !== null && error !== ""}>
				<TextError>{error ?? ""}</TextError>
			</Show>
		</div>
	);
}
