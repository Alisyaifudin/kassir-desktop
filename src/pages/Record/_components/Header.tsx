import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { formatDate } from "~/lib/utils";
import { Filter } from "./FilterDialog";
import { FormNo } from "./FormHeader";
import { Context } from "../Records";
import { getParam, setParam } from "../_utils/params";
import { useSearchParams } from "react-router";

export function Header({ methods, context }: { methods: DB.Method[]; context: Context }) {
	const [search, setSearch] = useSearchParams();
	const { time, yesterday, tomorrow } = getParam(search).time;
	const setTime = setParam(setSearch).time;
	return (
		<div className="flex gap-2 items-center w-full justify-between">
			<div className="flex gap-1 items-center">
				<Button variant={"ghost"} onClick={() => setTime(yesterday)}>
					<ChevronLeft />
				</Button>
				<Calendar time={time} setTime={(time) => setTime(time)}>
					<p>{formatDate(time, "long")}</p>
				</Calendar>
				<Button variant={"ghost"} onClick={() => setTime(tomorrow)}>
					<ChevronRight />
				</Button>
			</div>
			<Filter methods={methods} />
			<FormNo context={context} />
		</div>
	);
}
