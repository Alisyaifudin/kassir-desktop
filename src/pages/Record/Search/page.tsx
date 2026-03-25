import { Header } from "./z-Header";
import { Search } from "./z-Search";

export default function Page() {
  return (
    <main className="flex flex-col gap-2 p-2 h-full overflow-hidden">
      <Header />
      <Search />
    </main>
  );
}
