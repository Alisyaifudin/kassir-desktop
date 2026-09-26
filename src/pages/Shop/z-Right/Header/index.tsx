import { SheetTab } from "./z-SheetTab";

export function Header() {
  return (
    <div className="flex flex-col border-b">
      <div className="flex gap-2 items-end justify-between">
        <SheetTab />
      </div>
    </div>
  );
}
