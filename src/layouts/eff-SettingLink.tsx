import { Settings } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { Kbd } from "~/components/ui/kbd";
import { Effect } from "effect";
import { ShortcutService } from "~/services/shortcut";
import { RouterService } from "~/services/router";
import { Icon } from "~/components/ui/icon";
import { Show } from "~/components/Show";
import { Block } from "~/components/block/block";
import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const wrapperStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
});

const kbdStyles = stylex.create({
  base: {
    position: "absolute",
    bottom: `calc(-1 * ${sizes.kbdOffsetY})`,
    left: `calc(-1 * ${sizes.gap})`,
    zIndex: 10,
  },
});

const iconStyles = stylex.create({
  base: {
    borderRadius: sizes.radiusFull,
    height: sizes.topnavIconSize,
    width: sizes.topnavIconSize,
    transitionProperty: "all",
    ":hover": {
      backgroundColor: colors.hoverNav,
    },
  },
  active: {
    backgroundColor: `color-mix(in oklch, ${colors.background} 80%, transparent)`,
  },
});

const settingsIconStyles = stylex.create({
  base: {
    width: sizes.topnavIconInner,
    height: sizes.topnavIconInner,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

export const settingLink = Effect.gen(function* () {
  const shortcutService = yield* ShortcutService;
  const routerService = yield* RouterService;
  const useLocation = () => routerService.useLocation();
  const useNavigate = () => routerService.useNavigate();
  const useShowShortcut = () => shortcutService.useShowShortcut();
  const hideShortcut = () => shortcutService.hideShortcut();
  return function SettingLink() {
    const { pathname, search } = useLocation();
    const show = useShowShortcut();
    const navigate = useNavigate();
    const isActive = pathname.includes("/setting");

    return (
      <Block style={wrapperStyles.base}>
        <Show when={show}>
          <Kbd style={kbdStyles.base}>alt+4</Kbd>
        </Show>
        <Icon
          variant={isActive ? "secondary" : "ghost"}
          onClick={() => {
            const newSearch = new URLSearchParams(search);
            newSearch.set("url_back", "/");
            navigate({
              pathname: "/setting",
              search: newSearch.toString(),
            });
            hideShortcut();
          }}
          style={[iconStyles.base, isActive && iconStyles.active] as StyleXStyles}
        >
          <Settings {...stylex.props(settingsIconStyles.base)} />
        </Icon>
      </Block>
    );
  };
});
