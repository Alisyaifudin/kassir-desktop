import { NavLink, Option } from "./NavLink";

export function NavList({ children, selected }: { selected: Option; children?: React.ReactNode }) {
  return (
    <aside className="flex flex-col gap-2">
      <NavLink selected={selected} to="cashflow" />
      <NavLink selected={selected} to="net" />
      <NavLink selected={selected} to="crowd" />
      <NavLink selected={selected} to="products" />
      <NavLink selected={selected} to="performance" />
      <hr />
      {children}
    </aside>
  );
}

// <Either
//   if={option === "products"}
//   then={<SummaryProduct start={start} end={end} mode={mode} products={products} />}
//   else={
//     <Summary
//       start={start}
//       end={end}
//       time={time}
//       interval={interval === "daily" ? "weekly" : interval}
//       records={records}
//       option={option as any}
//     />
//   }
// />
