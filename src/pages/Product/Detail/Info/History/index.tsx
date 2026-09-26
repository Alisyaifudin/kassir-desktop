import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { HistoryTable } from "./z-HistoryTable";
import { useMode } from "./use-mode";
import { useHistory } from "./use-history";
import { useId } from "../../use-id";
import { Result } from "~/lib/result";
import { ErrorComponent } from "~/components/ErrorComponent";
import { log } from "~/lib/log";
import { ProductHistory } from "~/database/product/get-history-offset";
import { usePage } from "./use-page";
import { Loading } from "./z-Loading";

export function History() {
  const id = useId();
  const res = useHistory(id);
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess({totalPage, histories}) {
      return <HistoryList histories={histories} totalPage={totalPage} />;
    },
  });
}


function HistoryList({ histories, totalPage }: { histories: ProductHistory[]; totalPage: number }) {
  const [mode, setMode] = useMode();
  const [page, setPage] = usePage()
  const handlePrev = () => {
    const newPage = page > 0 ? page - 1 : 1;
    setPage(newPage);
  };
  const handleNext = () => {
    const newPage = page < totalPage ? page + 1 : totalPage;
    setPage(newPage);
  };
  return (
    <div className="flex flex-col  gap-2 w-full p-1 h-full overflow-hidden">
      <div className="flex items-center justify-between">
        <RadioGroup
          value={mode}
          className="flex items-center gap-5"
          onValueChange={(v) => {
            const parsed = z.enum(["sell", "buy"]).safeParse(v);
            setMode(parsed.success ? parsed.data : "sell");
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sell" id="sell" />
            <Label htmlFor="sell" className="text-3xl">
              Jual
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="buy" id="buy" />
            <Label htmlFor="buy" className="text-3xl">
              Beli
            </Label>
          </div>
        </RadioGroup>
        <div className="flex gap-5 items-center">
          <Button onClick={handlePrev} disabled={page === 1}>
            <ChevronLeft className="icon" />
          </Button>
          <span>
            {page}/{totalPage}
          </span>
          <Button onClick={handleNext} disabled={page === totalPage || totalPage === 0}>
            <ChevronRight className="icon" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="max-h-full overflow-hidden flex">
          <HistoryTable products={histories} mode={mode} />
        </div>
      </div>
    </div>
  );
}
