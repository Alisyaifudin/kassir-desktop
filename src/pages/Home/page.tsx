import { header } from "./effect-header";
import { navGrid } from "./effect-navGrid";
import { Effect } from "effect";
import { statsGrid } from "./effect-StatsGrid";

const page = Effect.gen(function* () {
  const NavGrid = yield* navGrid;
  const Header = yield* header;
  const StatsGrid = yield* statsGrid;
  return function Page() {
    return (
      <div className="h-[calc(100vh-64px)] small:h-[calc(100vh-48px)] overflow-y-auto overflow-x-hidden w-full">
        <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500 pb-20">
          <Header />
          <StatsGrid />
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 bg-primary rounded-full" />
            <h2 className="text-big font-bold tracking-tight">Navigasi Utama</h2>
          </div>
          <NavGrid />
        </div>
      </div>
    );
  };
});

export default page;
