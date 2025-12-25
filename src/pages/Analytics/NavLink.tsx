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
  let search = new URLSearchParams(window.location.search);
  switch (to) {
    case "products":
    case "crowd": {
      search.set("interval", "day");
      break;
    }
    default: {
      search.set("interval", "month");
      break;
    }
  }
  const handleClick = () => {
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
