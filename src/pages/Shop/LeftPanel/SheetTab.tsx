import { ForEach } from "~/components/ForEach";
import { DeleteSheet } from "../DeleteSheet";
import { Show } from "~/components/Show";
import { cn, safeJSON } from "~/lib/utils";
import { useSheet } from "~/pages/Shop/use-sheet";
import { useTabs } from "~/pages/Shop/use-tab";
import { useMode } from "~/pages/Shop/use-mode";
import { useMemo } from "react";
import { z } from "zod";

const label = {
	sell: "J",
	buy: "B",
};

export function SheetTab() {
	const [currentMode] = useMode();
	const [sheet, setSheet] = useSheet();
	const [tabs, _, deleteTab] = useTabs();
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
		<div className="flex items-center gap-1 bg-white px-0.5 pt-0.5 left-2 max-w-[830px] overflow-x-auto">
			<ForEach items={modes}>
				{({ tab, mode }) => (
					<div
						className={cn("rounded-b-0 bg-zinc-100 rounded-t-md text-3xl outline flex items-center gap-1", {
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
