import { NavLink, Option } from "./z-NavLink";

export function NavList({ children, selected }: { selected: Option; children?: React.ReactNode }) {
  return (
    <aside className="flex flex-col gap-2">
      <NavLink selected={selected} to="cashflow" />
      <NavLink selected={selected} to="net" />
      <NavLink selected={selected} to="crowd" />
      <NavLink selected={selected} to="products" />
      <hr />
      {children}
    </aside>
  );
}
