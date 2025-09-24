import { ForEach } from "~/components/ForEach";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { DeleteSheet } from "./DeleteSheet";
import { Show } from "~/components/Show";
import { cn, safeJSON } from "~/lib/utils";
import { useSheet } from "../use-sheet";
import { useTabs } from "../use-tab";
import { useMode } from "../_hooks/use-mode";
import { useMemo } from "react";
import { z } from "zod";

const label = {
	sell: "J",
	buy: "B",
};

export function Tab() {
	const [currentMode] = useMode();
	const [sheet, setSheet] = useSheet();
	const [tabs, addTab, deleteTab] = useTabs();
	const modes = useMemo(() => {
		const modes: { mode: DB.Mode; tab: number }[] = [];
		for (const tab of tabs.values()) {
			if (sheet === tab) {
				modes.push({ mode: currentMode, tab });
				continue;
			}
			const mode = getMode(tab);
			if (mode === null) continue;
			modes.push({ mode, tab });
		}
		return modes;
	}, [currentMode, tabs]);
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

function getMode(sheet: number): DB.Mode | null {
	const key = "state-" + sheet;
	const local = localStorage.getItem(key);
	if (local === null) return null;
	const [errJson, obj] = safeJSON(local);
	if (errJson) return null;
	const parsed = z
		.object({
			mode: z.enum(["buy", "sell"]),
		})
		.safeParse(obj);
	if (!parsed.success) return null;
	return parsed.data.mode;
}
