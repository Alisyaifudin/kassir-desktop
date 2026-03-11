import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

export type Option = "cashflow" | "net" | "crowd" | "products";

const label = {
  cashflow: "Arus Kas",
  net: "Net",
  crowd: "Keramaian",
  products: "Produk",
};

const path = {
  cashflow: "",
  net: "net",
  crowd: "crowd",
  products: "products",
};

export function NavLink({ selected, to }: { to: Option; selected: Option }) {
  const navigate = useNavigate();
  const handleClick = () => {
    const search = new URLSearchParams(window.location.search);
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
