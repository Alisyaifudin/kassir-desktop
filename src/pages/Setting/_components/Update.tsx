import { Button } from "~/components/ui/button";
import { BellRing, Loader2 } from "lucide-react";
import { update, useUpdate } from "../_hooks/use-update";
import { Store } from "~/lib/store";
import { Async } from "~/components/Async";
import { Spinner } from "~/components/Spinner";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Update({
	notify,
	toast,
	store,
}: {
	notify: (notification: React.ReactNode) => void;
	toast: (v: string) => void;
	store: Store;
}) {
	const size = useSize();
	const { state, loading, handleClick } = useUpdate(update, notify, toast, store);
	return (
		<div className="flex flex-col gap-1">
			<Async
				state={state}
				Loading={
					<Button style={style[size].text} onClick={handleClick} variant="secondary">
						Update <Loader2 size={style[size].icon} className="animate-spin" />
					</Button>
				}
			>
				{(data) => (
					<>
						<Button style={style[size].text} onClick={handleClick} variant="secondary">
							Update <Spinner when={loading} />
							<Show when={data === "true"}>
								<BellRing size={style[size].icon} className="text-red-500 animate-ring" />
							</Show>
						</Button>
						<Show when={data === "true"}>
							<p style={style[size].text}>Ada versi baru!</p>
						</Show>
					</>
				)}
			</Async>
		</div>
	);
}
