import { RefreshCcw } from "lucide-react";
import { useCallback } from "react";
import * as stylex from "@stylexjs/stylex";
import { Icon } from "~/components/ui/icon";
import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const iconStyles = stylex.create({
  base: {
    borderRadius: sizes.radiusFull,
    height: sizes.topnavIconSize,
    width: sizes.topnavIconSize,
    ":hover": {
      backgroundColor: colors.hoverNav,
    },
  },
});

const refreshIconStyles = stylex.create({
  base: {
    width: sizes.topnavIconInner,
    height: sizes.topnavIconInner,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

export function Refresh() {
  const refresh = useCallback(() => {
    // TODO: DO NOT DELETE
    // db.customer.revalidate();
    // db.extra.revalidate();
    // db.image.revalidate();
    // db.method.revalidate();
    // db.product.revalidate();
    // db.social.revalidate();
    window.location.reload();
  }, []);
  return (
    <Icon style={iconStyles.base} onClick={refresh} variant="ghost">
      <RefreshCcw {...stylex.props(refreshIconStyles.base)} />
    </Icon>
  );
}
