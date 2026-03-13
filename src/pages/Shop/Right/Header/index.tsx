import { SheetTab } from "./z-SheetTab";
import { ModeTab } from "./z-ModeTab";

export function Header() {
  return (
    <div className="flex flex-col border-b">
      <div className="flex gap-2 items-end justify-between">
        <div className="flex items-center gap-1">
          <SheetTab />
        </div>
        <div className="pb-1">
          <ModeTab />
        </div>
      </div>
      {/* <HeaderColumn /> */}
    </div>
  );
}
