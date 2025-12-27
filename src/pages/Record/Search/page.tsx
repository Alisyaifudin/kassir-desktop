import { useLoaderData } from "react-router";
import { Header } from "./Header";
import { Search } from "./Search";
import { Loader } from "./loader";

export default function Page() {
  const histories = useLoaderData<Loader>();
  return (
    <main className="flex flex-col gap-2 p-2 flex-1 overflow-hidden">
      <Header />
      <Search histories={histories} />
    </main>
  );
}
