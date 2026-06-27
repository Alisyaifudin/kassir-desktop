import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { DateRange } from "~/components/DateRange";
import { useRecord } from "./use-record-download";

export default function RecordDownload() {
  const { loading, error, handleSubmit, range, setRange } = useRecord();
  return (
    <div className="flex gap-2 flex-col p-2 ">
      <div className="flex gap-2 items-center justify-between ">
        <h3 className="italic text-normal font-bold">Riwayat</h3>
      </div>
      <form onSubmit={handleSubmit} className="text-2xl flex justify-between items-end">
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