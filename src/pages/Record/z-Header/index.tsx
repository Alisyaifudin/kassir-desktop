import { ChevronLeft, ChevronRight, FolderSearch } from "lucide-react";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { Filter } from "./FilterDialog";
import { SearchBars } from "./SearchBars";
import { ModeTab } from "./ModeTab";
import { useNavigate } from "react-router";
import { formatDate } from "~/lib/date";
import { useTime } from "../use-time";

export function Header() {
  const [{ yesterday, time, tomorrow }, setTime] = useTime();
  const navigate = useNavigate();
  return (
    <div className="flex gap-2 items-center w-full justify-between">
      <div className="flex gap-1 items-center">
        <ModeTab />
        <Filter />
      </div>
      <SearchBars />
      <Button
        className="cursor-pointer"
        onClick={() => {
          const urlBack = encodeURIComponent(window.location.href);
          navigate({ pathname: "/records/search", search: `?url_back=${urlBack}` });
        }}
      >
        <FolderSearch className="icon" />
      </Button>
      <div className="flex gap-1 items-center">
        <Button className="p-2" variant={"ghost"} onClick={() => setTime(yesterday)}>
          <ChevronLeft className="icon" />
        </Button>
        <Calendar time={time} setTime={(time) => setTime(time)}>
          <p>{formatDate(time, "long")}</p>
        </Calendar>
        <Button className="p-2" variant={"ghost"} onClick={() => setTime(tomorrow)}>
          <ChevronRight className="icon" />
        </Button>
      </div>
    </div>
  );
}
