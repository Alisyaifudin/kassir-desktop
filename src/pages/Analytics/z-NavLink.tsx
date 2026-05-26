import { useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";

export type Option = "cashflow" | "net" | "crowd" | "products" | "debt";

const label = {
  cashflow: "Arus Kas",
  net: "Net",
  crowd: "Keramaian",
  debt: "Utang",
  products: "Produk",
};

const path = {
  cashflow: "",
  net: "net",
  crowd: "crowd",
  debt: "debt",
  products: "products",
};

export function NavLink({ selected, to }: { to: Option; selected: Option }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const handleClick = () => {
    const interval = search.get("interval");
    switch (to) {
      case "crowd":
      case "products":
        search.set("interval", "day");
        break;
      case "cashflow":
      case "net": {
        if (interval === "day") {
          search.set("interval", "month");
        }
        break;
      }
    }
    navigate({ pathname: `/analytics/${path[to]}`, search: search.toString() });
  };
  return (
    <Button
      className="cursor-pointer"
      onClick={handleClick}
      variant={selected === to ? "default" : "link"}
    >
      {label[to]}
    </Button>
  );
}
