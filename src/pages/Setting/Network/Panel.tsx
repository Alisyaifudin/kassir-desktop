import { useStore } from "~/RootLayout";
import { useConnection } from "./use-connect";
import { Await } from "~/components/Await";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useUpload } from "./use-upload";
import { DeleteBtn } from "./DeleteBtn";
import { useDownload } from "./use-download";

export function Panel({
	option,
}: {
	option: {
		name: string;
		password: string;
		url: string;
	};
}) {
	const store = useStore();
	const { connect, disconnect, state } = useConnection(store, option.url);
	return (
		<Await state={state}>
			{(token) => (
				<div className="flex items-center justify-between gap-2">
					<Show when={token !== null}>
						<div className="flex flex-col gap-1">
							<p className="text-3xl font-bold">Pengaturan Produk</p>
							<div className="flex items-center gap-2">
								<Upload token={token!} url={option.url} />
								<DeleteBtn token={token!} url={option.url} />
								<Download token={token!} url={option.url} />
							</div>
						</div>
					</Show>
					<div />
					<div className="flex flex-col gap-1">
						<Show
							when={token === null}
							fallback={
								<Button onClick={disconnect.handleDisconnect} variant="destructive">
									<Show when={disconnect.loading}>
										<Loader2 className="animate-spin" />
									</Show>
									Putuskan
								</Button>
							}
						>
							<Show when={connect.error !== null && connect.error !== null}>
								<TextError>{connect.error ?? ""}</TextError>
							</Show>
							<Button onClick={connect.handleConnect(option)} variant="outline">
								<Show when={connect.loading}>
									<Loader2 className="animate-spin" />
								</Show>
								Hubungkan
							</Button>
						</Show>
					</div>
				</div>
			)}
		</Await>
	);
}

function Upload({ token, url }: { token: string; url: string }) {
	const { error, loading, handleClick } = useUpload(token, url);
	return (
		<div className="flex flex-col gap-1">
			<Button onClick={handleClick}>
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

function Download({ token, url }: { token: string; url: string }) {
	const { error, loading, handleClick } = useDownload(token, url);
	return (
		<div className="flex flex-col gap-1">
			<Button onClick={handleClick}>
				Unduh
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
