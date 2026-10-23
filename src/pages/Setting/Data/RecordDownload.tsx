import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { DateRange } from "~/components/DateRange";
import { useRecord } from "./use-record-download";

export default function RecordDownload() {
  const { loading, error, handleSubmit, range, setRange } = useRecord();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-normal font-medium">Riwayat</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end justify-between text-normal">
        <input type="hidden" name="action" value="record"></input>
        <div className="flex gap-3 items-end">
          <DateRange range={range} setRange={setRange} />
        </div>
        <Button>
          Unduh <Spinner when={loading} />
        </Button>
      </form>
      <TextError>{error}</TextError>
    </div>
  );
}
