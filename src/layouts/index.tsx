import { Toaster } from "~/components/ui/sonner";
import { Effect } from "effect";
import { UserService } from "~/services/user";
import { ShortcutService } from "~/services/shortcut";
import { topBar } from "./eff-Topbar";
import { RouterService } from "~/services/router";
import { VStack } from "~/components/block/stack";
import { redirect } from "~/components/Redirect";
import { Expandable } from "~/components/block/expandable";
import { WithLoader } from "~/components/WithLoader";
import { errorComponent } from "~/components/ErrorComponent";
import { Loading } from "./Loading";

const page = Effect.gen(function* () {
  const userService = yield* UserService;
  const shortcutService = yield* ShortcutService;
  const routerService = yield* RouterService;
  const useAuth = () => userService.useAuth();
  const useNavigationShortcuts = () => shortcutService.useNavigationShortcuts();
  const useLocation = () => routerService.useLocation();
  const Redirect = yield* redirect;
  const Topbar = yield* topBar;

  return function Page({ children }: { children: React.ReactNode }) {
    useNavigationShortcuts();
    const user = useAuth();
    const { pathname } = useLocation();
    const startWithLogin = pathname.startsWith("/login");
    const userIsNull = user == null;
    if (userIsNull) {
      if (startWithLogin) {
        return <>{children}</>;
      } else {
        return <Redirect to="/login" />;
      }
    } else {
      if (startWithLogin) {
        return <Redirect to="/" />;
      } else {
        return (
          <VStack>
            <Topbar />
            <Expandable>{children}</Expandable>
            <Toaster />
          </VStack>
        );
      }
    }
  };
});

const layout = Effect.gen(function* () {
  const userService = yield* UserService;
  const loader = () => userService.loader();
  const Page = yield* page;
  const ErrorComponent = yield* errorComponent;
  return function Layout({ children }: { children: React.ReactNode }) {
    return (
      <WithLoader
        loader={loader}
        loading={<Loading />}
        error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
      >
        <Page>{children}</Page>
      </WithLoader>
    );
  };
});

export default layout;
