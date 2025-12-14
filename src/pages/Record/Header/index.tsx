import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { formatDate } from "~/lib/utils";
import { Filter } from "./FilterDialog";
import { getParam, setParam } from "../utils/params";
import { useSearchParams } from "react-router";
import { Size } from "~/lib/store-old";
import { SearchBars } from "./SearchBars";
import { ModeTab } from "./ModeTab";

export function Header({ methods, size }: { methods: DB.Method[]; size: Size }) {
  const [search, setSearch] = useSearchParams();
  const { time, yesterday, tomorrow } = getParam(search).time;
  const setTime = setParam(setSearch).time;
  return (
    <div className="flex gap-2 items-center w-full justify-between">
      <div className="flex gap-1 items-center">
        <ModeTab />
        <Filter methods={methods} size={size} />
      </div>
      <SearchBars />
      <div className="flex gap-1 items-center">
        <Button className="p-2" variant={"ghost"} onClick={() => setTime(yesterday)}>
          <ChevronLeft className="icon" />
        </Button>
        <Calendar time={time} setTime={(time) => setTime(time)} size={size}>
          <p>{formatDate(time, "long")}</p>
        </Calendar>
        <Button className="p-2" variant={"ghost"} onClick={() => setTime(tomorrow)}>
          <ChevronRight className="icon" />
        </Button>
      </div>
    </div>
  );
}
