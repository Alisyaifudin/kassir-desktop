import { ForEach } from "~/components/ForEach";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { DeleteSheet } from "./DeleteSheet";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { useSheet } from "../_hooks/use-sheet";
import { useTabs } from "../_hooks/use-tab";
import { getState, LocalContext } from "../_hooks/use-local-state";
import { useMode } from "../_hooks/use-mode";
import { useMemo } from "react";

const label = {
	sell: "J",
	buy: "B",
};

export function Tab({ methods, context }: { methods: DB.Method[]; context: LocalContext }) {
	const [mode] = useMode(context);
	const [sheet, setSheet] = useSheet();
	const [tabs, addTab, deleteTab] = useTabs();
	const modes = useMemo(() => {
		const modes: { mode: DB.Mode; tab: number }[] = [];
		for (const tab of tabs.values()) {
			if (sheet === tab) {
				modes.push({ mode, tab });
				continue;
			}
			const state = getState(methods, tab);
			if (state === null) continue;
			modes.push({ mode: state.mode, tab });
		}
		return modes;
	}, [mode, tabs]);
	return (
		<div className="flex items-center gap-1 fixed bottom-0 z-20 shadow-lg bg-white px-0.5 pt-0.5 left-2 sm:max-w-[500px] lg:max-w-[1000px] overflow-x-auto">
			<ForEach items={modes}>
				{({ tab, mode }) => (
					<div
						className={cn("rounded-b-0 rounded-t-md text-3xl outline flex items-center gap-1", {
							"bg-black text-white": sheet === tab,
						})}
					>
						<button className="p-2" onClick={() => setSheet(tab)}>
							{label[mode]}
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
