import { Button } from "~/components/ui/button";
import { BellRing, Loader2 } from "lucide-react";
import { update, useUpdate } from "../_hooks/use-update";
import { Store } from "~/lib/store";
import { Async } from "~/components/Async";
import { Spinner } from "~/components/Spinner";
import { Show } from "~/components/Show";

export function Update({
	notify,
	toast,
	store,
}: {
	notify: (notification: React.ReactNode) => void;
	toast: (v: string) => void;
	store: Store;
}) {
	const { state, loading, handleClick } = useUpdate(update, notify, toast, store);
	return (
		<div className="flex flex-col gap-1">
			<Async
				state={state}
				Loading={
					<Button onClick={handleClick} variant="secondary">
						Update <Loader2 className="animate-spin" />
					</Button>
				}
			>
				{(data) => (
					<>
						<Button onClick={handleClick} variant="secondary">
							Update <Spinner when={loading} />
							<Show when={data === "true"}>
								<BellRing className="text-red-500 animate-ring" />
							</Show>
						</Button>
						<Show when={data === "true"}>
							<p className="text-2xl">Ada versi baru!</p>
						</Show>
					</>
				)}
			</Async>
		</div>
	);
}
