import { Right } from "./Right";
import { Left } from "./Left";

export default function Page() {
  return (
    <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
      <div className="gap-2 pt-1 flex h-full">
        <Left />
        <Right />
      </div>
    </main>
  );
}
