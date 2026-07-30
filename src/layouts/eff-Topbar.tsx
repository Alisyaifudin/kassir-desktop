import { ArrowLeft } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { Refresh } from "./z-Refresh";
import { Effect } from "effect";
import { RouterService } from "~/services/router";
import { Icon } from "~/components/ui/icon";
import { WithLoader } from "~/components/WithLoader";
import { InfoService } from "~/services/info";
import { titleText } from "./eff-Title";
import { TextError } from "~/components/TextError";
import { topNavList } from "./eff-TopNavList";
import { settingLink } from "./eff-SettingLink";
import { Skeleton } from "~/components/ui/skeleton";
import { colors, sizes } from "~/tokens.stylex";
import { Block, Header } from "~/components/block/block";
import { Nav } from "~/components/block/nav";
import { H1 } from "~/components/block/heading";

// ── Styles ───────────────────────────────────────────────────────────────────

const headerStyles = stylex.create({
  base: {
    width: "100%",
    backgroundColor: colors.headerBg,
    height: sizes.headerHeight,
  },
});

const navStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "100%",
    paddingLeft: sizes.buttonPadX,
    paddingRight: sizes.buttonPadX,
    borderBottomWidth: sizes.borderWidth,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
  },
});

const leftStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    gap: sizes.gapMd,
    height: "100%",
  },
});

const backIconStyles = stylex.create({
  base: {
    borderRadius: sizes.radiusFull,
    height: sizes.topnavIconSize,
    width: sizes.topnavIconSize,
    ":hover": {
      backgroundColor: colors.hoverNav,
    },
  },
});

const backIconInnerStyles = stylex.create({
  base: {
    width: sizes.topnavIconInner,
    height: sizes.topnavIconInner,
  },
});

const titleStyles = stylex.create({
  base: {
    fontWeight: 700,
    letterSpacing: "-0.025em",
    transitionProperty: "all",
    fontSize: sizes.textNav,
    lineHeight: sizes.lineHeightNav,
  },
});

const skeletonWrapperStyles = stylex.create({
  base: {
    display: "none",
    marginLeft: sizes.buttonPadX,
    borderLeftWidth: sizes.borderWidth,
    borderLeftStyle: "solid",
    borderLeftColor: colors.borderSubtle2,
    paddingLeft: sizes.buttonPadX,
  },
});

const skeletonStyles = stylex.create({
  base: {
    height: sizes.kbdHeight,
    width: sizes.skeletonWidth,
  },
});

const rightStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    gap: sizes.gapLg,
    height: "100%",
  },
});

const separatorStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    gap: sizes.gap,
    paddingLeft: sizes.buttonPadX,
    borderLeftWidth: sizes.borderWidth,
    borderLeftStyle: "solid",
    borderLeftColor: colors.borderSubtle,
    height: sizes.topnavIconSize,
    marginTop: "auto",
    marginBottom: "auto",
  },
});

// ── Constants ────────────────────────────────────────────────────────────────

const routeTitles: Record<string, string> = {
  "/": "Beranda",
  "/shop": "Toko",
  "/method": "Metode",
  "/customer": "Pelanggan",
  "/cashier": "Kasir",
  "/social": "Kontak",
  "/stock": "Stok",
  "/records": "Riwayat",
  "/analytics": "Analisis",
  "/money": "Uang",
  "/setting": "Pengaturan",
};

// ── Component ────────────────────────────────────────────────────────────────

export const topBar = Effect.gen(function* () {
  const routerService = yield* RouterService;
  const infoService = yield* InfoService;
  const useNavigate = () => routerService.useNavigate();
  const useLocation = () => routerService.useLocation();
  const useGetUrlBack = (defaultPath: string) => routerService.useGetUrlBack(defaultPath);
  const infoLoader = () => infoService.loader();
  const TitleText = yield* titleText;
  const TopNavList = yield* topNavList;
  const SettingLink = yield* settingLink;
  return function Topbar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const backUrl = useGetUrlBack("/");

    const activeRoute = Object.keys(routeTitles)
      .sort((a, b) => b.length - a.length)
      .find((route) => pathname.startsWith(route));

    const title = activeRoute ? routeTitles[activeRoute] : "Aplikasi Kasir";
    const isHome = pathname === "/";

    return (
      <Header style={headerStyles.base}>
        <Nav style={navStyles.base}>
          <Block style={leftStyles.base}>
            {!isHome && (
              <Icon variant="ghost" onClick={() => navigate(backUrl)} style={backIconStyles.base}>
                <ArrowLeft {...stylex.props(backIconInnerStyles.base)} />
              </Icon>
            )}
            <H1 style={titleStyles.base}>{isHome ? "Beranda" : title}</H1>
            <WithLoader
              loader={infoLoader}
              loading={
                <Block style={skeletonWrapperStyles.base}>
                  <Skeleton style={skeletonStyles.base} />
                </Block>
              }
              error={(error) => <TextError>{error.e.message}</TextError>}
            >
              <TitleText />
            </WithLoader>
          </Block>

          <Block style={rightStyles.base}>
            <TopNavList />
            <Block style={separatorStyles.base}>
              <SettingLink />
              <Refresh />
            </Block>
          </Block>
        </Nav>
      </Header>
    );
  };
});
