import { Header } from "./z-Header";
import { StatsGrid } from "./z-StatsGrid";
import { NavGrid } from "./z-NavGrid";

export default function Page() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      <Header />
      <StatsGrid />
      
      <div className="flex items-center gap-2 mb-4">
        <div className="h-1 w-8 bg-primary rounded-full" />
        <h2 className="text-xl font-bold tracking-tight">Navigasi Utama</h2>
      </div>
      
      <NavGrid />
    </div>
  );
}
