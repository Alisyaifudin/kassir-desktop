import { Right } from "./z-Right";
import { Left } from "./z-Left";
import { Complete } from "./z-Complete";

export default function Page() {
  return (
    <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
      <div className="gap-2 pt-1 grid grid-cols-[clamp(360px,33%,500px)_1fr] overflow-x-hidden h-full">
        <Left />
        <Right />
      </div>
      <Complete />
    </main>
  );
}
