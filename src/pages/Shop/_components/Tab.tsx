import { ForEach } from "~/components/ForEach";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { DeleteSheet } from "./DeleteSheet";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { useSheet } from "../_hooks/use-sheet";
import { useTabs } from "../_hooks/use-tab";

export function Tab() {
	const [sheet, setSheet] = useSheet();
	const [tabs, addTab, deleteTab] = useTabs();
	return (
		<div className="flex items-center gap-1 fixed bottom-0 z-20 bg-white p-0.5 left-2 sm:max-w-[500px] lg:max-w-[1000px] overflow-x-auto">
			<ForEach items={Array.from(tabs)}>
				{(tab) => (
					<div
						className={cn("rounded-b-0 rounded-t-md text-3xl outline flex items-center gap-1", {
							"bg-black text-white": sheet === tab,
						})}
					>
						<button className="p-2" onClick={() => setSheet(tab)}>
							{tab}
						</button>
						<Show when={tabs.size > 1}>
							<DeleteSheet del={deleteTab} tab={tab} />
						</Show>
					</div>
				)}
			</ForEach>
			<Button className="rounded-full" size="icon" onClick={addTab}>
				<Plus />
			</Button>
		</div>
	);
}
