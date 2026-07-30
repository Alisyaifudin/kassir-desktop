import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { Kbd } from "~/components/ui/kbd";
import { Effect } from "effect";
import { ShortcutService } from "~/services/shortcut";
import { Block } from "~/components/block/block";
import { RouterService } from "~/services/router";
import { ButtonBase } from "~/components/block/button";
import { colors, sizes } from "~/tokens.stylex";
import { Show } from "~/components/Show";

// ── Styles ───────────────────────────────────────────────────────────────────

const blockStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    height: "100%",
  },
});

const kbdStyles = stylex.create({
  base: {
    position: "absolute",
    top: `calc(-1 * ${sizes.inputPadY})`,
    left: `calc(-1 * ${sizes.inputPadY})`,
    zIndex: 30,
  },
});

const buttonStyles = stylex.create({
  base: {
    paddingLeft: sizes.buttonPadX,
    paddingRight: sizes.buttonPadX,
    height: sizes.navButtonHeight,
    fontWeight: 700,
    transitionProperty: "all",
    transitionDuration: "150ms",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: sizes.textNav,
    lineHeight: sizes.lineHeightNav,
    borderTopLeftRadius: sizes.radiusXl,
    borderTopRightRadius: sizes.radiusXl,
    borderLeftWidth: sizes.borderWidth,
    borderRightWidth: sizes.borderWidth,
    borderTopWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: "transparent",
    position: "relative",
    background: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    color: `color-mix(in oklch, ${colors.primary} 70%, transparent)`,
    ":hover": {
      backgroundColor: colors.hoverNav,
      color: colors.primary,
    },
  },
  active: {
    backgroundColor: colors.background,
    color: colors.primary,
    borderColor: colors.borderSubtle,
    marginBottom: "-1px",
    zIndex: 10,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

interface TopNavLinkProps {
  path: string;
  label: string;
  alt: string;
  root?: boolean;
}

export const topNavLink = Effect.gen(function* () {
  const shortcutService = yield* ShortcutService;
  const routerService = yield* RouterService;
  const useShowShortcut = () => shortcutService.useShowShortcut();
  const hideShortcut = () => shortcutService.hideShortcut();
  const useNavigate = () => routerService.useNavigate();
  const useLocation = () => routerService.useLocation();
  return function TopNavLink({ path, label, alt, root = false }: TopNavLinkProps) {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const show = useShowShortcut();
    const isActive = root ? pathname.startsWith(path) : pathname.includes(path);

    return (
      <Block style={blockStyles.base}>
        <Show when={show}>
          <Kbd style={kbdStyles.base}>{alt}</Kbd>
        </Show>
        <ButtonBase
          onClick={() => {
            const newSearch = new URLSearchParams(search);
            newSearch.set("url_back", "/");
            navigate({
              pathname: path,
              search: newSearch.toString(),
            });
            hideShortcut();
          }}
          style={[buttonStyles.base, isActive && buttonStyles.active] as StyleXStyles}
        >
          {label}
        </ButtonBase>
      </Block>
    );
  };
});
