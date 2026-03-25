import { ChevronLeft, ChevronRight, FolderSearch } from "lucide-react";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { Filter } from "./FilterDialog";
import { SearchBars } from "./SearchBars";
import { ModeTab } from "./ModeTab";
import { useNavigate } from "react-router";
import { formatDate } from "~/lib/date";
import { useTime } from "../use-time";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function Header() {
  const [{ yesterday, time, tomorrow }, setTime] = useTime();
  const navigate = useNavigate();
  const urlBack = useGenerateUrlBack("/records");
  return (
    <div className="flex gap-2 items-center w-full justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex gap-1.5 items-center">
        <ModeTab />
        <Filter />
      </div>

      <SearchBars />

      <Button
        className="h-10 w-10 shrink-0 rounded-lg border border-primary/10 transition-all shadow-sm"
        onClick={() => {
          navigate({
            pathname: "/records/search",
            search: `?url_back=${encodeURIComponent(urlBack)}`,
          });
        }}
      >
        <FolderSearch size={16} strokeWidth={2.5} />
      </Button>
      <div className="flex items-center bg-muted/30 gap-1 p-0.5 rounded-lg">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTime(yesterday)}
          className="rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </Button>

        <Calendar time={time} setTime={(time) => setTime(time)}>
          {formatDate(time, "long")}
        </Calendar>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTime(tomorrow)}
          className="rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
