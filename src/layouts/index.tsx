import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";
import { Effect } from "effect";
import { InfoService } from "~/services/info";
import { UserService } from "~/services/user";
import { ShortcutService } from "~/services/shortcut";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { Topbar } from "./z-Topbar";
import { TitleText } from "./z-Title";

const layout = Effect.gen(function* () {
  const infoService = yield* InfoService;
  const userService = yield* UserService;
  const shortcutService = yield* ShortcutService;

  const infoLoader = () => infoService.loader();
  const useName = () => infoService.info.useName();
  const useUser = () => userService.useUser();
  const useShowShortcut = () => shortcutService.useShowShortcut();
  const hideShortcut = () => shortcutService.hideShortcut();
  const toggleShortcut = () => shortcutService.toggleShortcut();

  return function Layout() {
    useNavigationShortcuts(hideShortcut, toggleShortcut);

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Topbar
          useUser={useUser}
          useShowShortcut={useShowShortcut}
          hideShortcut={hideShortcut}
          titleElement={
            <StateWrap
              loader={infoLoader}
              loading={
                <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
                  <Skeleton className="h-5 w-24" />
                </div>
              }
              error={(error) => <TextError>{error.e.message}</TextError>}
            >
              <TitleText useName={useName} />
            </StateWrap>
          }
        />
        <div id="main-body" className="flex-1">
          <Outlet />
        </div>
        <Toaster className="toast" />
      </div>
    );
  };
});

export default layout;
