import { ChevronLeft, ChevronRight, FolderSearch } from "lucide-react";
import { useNavigate } from "react-router";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { formatDate } from "~/lib/date";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { Filter } from "./FilterDialog";
import { SearchBars } from "./SearchBars";
import { ModeTab } from "./ModeTab";
import { useTime } from "../use-time";

export function Header({ busy }: { busy: boolean }) {
  const [{ yesterday, time, tomorrow }, setTime] = useTime();
  const navigate = useNavigate();
  const urlBack = useGenerateUrlBack("/records");
  return (
    /*
      A `fieldset` rather than a `div` so one `disabled` locks every control it
      holds — mode tabs, filter, search box, calendar, day steppers — with the
      fade coming from each control's own `disabled:` classes. Controls are
      locked even for a refetch they did not trigger: acting on the previous
      day's list is what we are preventing.
    */
    <fieldset
      disabled={busy}
      className="flex gap-2 items-center w-full justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10"
    >
      <div className="flex gap-1.5 items-center">
        <ModeTab />
        <Filter />
      </div>

      <SearchBars />

      <Button
        className="h-10 w-10 shrink-0 rounded-lg border border-primary/10 transition-all shadow-sm"
        aria-label="Pencarian komprehensif"
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
          aria-label="Hari sebelumnya"
          title="Hari sebelumnya"
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
          aria-label="Hari berikutnya"
          title="Hari berikutnya"
          onClick={() => setTime(tomorrow)}
          className="rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </fieldset>
  );
}
