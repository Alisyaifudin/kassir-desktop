import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { use, useEffect } from "react";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { HistoryTable } from "./HistoryList";
import { usePage } from "./use-page";
import { useMode } from "./use-mode";
import { HistoryPromise } from "../loader";
import { TextError } from "~/components/TextError";
import { LIMIT } from "../constants";
import { ProductHistory } from "~/database/product/history";

export function History({ histories: promise }: { histories: HistoryPromise }) {
  const [errMsg, data] = use(promise);
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  const { total, histories } = data;
  return <HistoryList histories={histories} total={total} />;
}

function HistoryList({ histories, total }: { histories: ProductHistory[]; total: number }) {
  const [page, setPage] = usePage();
  const [mode, setMode] = useMode();
  const totalPage = Math.ceil(total / LIMIT);
  useEffect(() => {
    if (page > totalPage) {
      setPage(totalPage);
    }
  }, [page, totalPage]);
  const handlePrev = () => {
    const newPage = page > 0 ? page - 1 : 1;
    setPage(newPage);
  };
  const handleNext = () => {
    const newPage = page < totalPage ? page + 1 : totalPage;
    setPage(newPage);
  };
  return (
    <div className="flex flex-col gap-2 w-full p-1 h-full overflow-hidden">
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
          <p className="text-3xl">
            {page}/{totalPage}
          </p>
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
