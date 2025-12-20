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
  let search = window.location.search;
  if (to === "products") {
    const s = new URLSearchParams(search);
    s.delete("interval");
    search = "?" + s.toString();
  }
  console.log(search);
  const handleClick = () => {
    navigate({ pathname: `/analytics/${path[to]}`, search });
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
