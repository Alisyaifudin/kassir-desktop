import { ChevronLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { useRange } from "./use-range";
import { DateRange } from "~/components/DateRange";
import { getBackURL } from "~/lib/utils";

export function Header() {
  const navigate = useNavigate();
  const [range, setRange] = useRange();
  const [search] = useSearchParams();
  const handleBack = () => {
    const urlBack = getBackURL("/records", search);
    navigate(urlBack);
  };
  return (
    <header className="flex items-center justify-between">
      <Button onClick={handleBack} variant="link" className="py-0 cursor-pointer">
        <ChevronLeft className="icon" /> Kembali
      </Button>
      <h1 className="font-bold text-big">Pencarian Komprehensif</h1>
      <div className="flex items-center gap-3">
        <p>Rentang:</p>
        <DateRange range={range} setRange={setRange} />
      </div>
    </header>
  );
}
