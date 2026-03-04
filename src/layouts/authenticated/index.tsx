import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { Title } from "./z-Title";
import { NavList } from "./z-NavList";

export default function Layout() {
  return (
    <>
      <header className="bg-sky-300 flex">
        <nav className="flex px-3 justify-between w-full items-end">
          <Title />
          <NavList />
        </nav>
      </header>
      <Outlet />
      <Toaster className="toast" />
    </>
  );
}

//  <Notification>{notification}</Notification>
