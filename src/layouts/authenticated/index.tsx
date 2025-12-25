import { data, Outlet, useLoaderData } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { Suspense } from "react";
import { Title } from "./Title";
import { NavList } from "./NavList";
import { store } from "~/store";
import { Loader2 } from "lucide-react";

export async function loader() {
  const owner = store.owner();
  return data(owner);
}

export default function Layout() {
  const owner = useLoaderData<typeof loader>();
  return (
    <>
      <header className="bg-sky-300 flex">
        <nav className="flex px-3 justify-between w-full items-end">
          <Suspense fallback={<Loader2 className="animate-spin" />}>
            <Title>{owner}</Title>
          </Suspense>
          <NavList></NavList>
        </nav>
      </header>
      <Outlet />
      {/* <Notification>{notification}</Notification> */}
      <Toaster className="toast" />
    </>
  );
}
