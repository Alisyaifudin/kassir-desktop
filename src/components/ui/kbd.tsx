import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const kbdStyles = stylex.create({
  base: {
    display: "inline-flex",
    height: sizes.kbdHeight,
    width: "fit-content",
    minWidth: sizes.kbdHeight,
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.inputPadY,
    borderRadius: sizes.radiusXs,
    paddingLeft: sizes.inputPadY,
    paddingRight: sizes.inputPadY,
    fontFamily: "sans-serif",
    fontSize: sizes.textXs,
    fontWeight: 500,
    color: colors.mutedForeground,
    backgroundColor: colors.muted,
    pointerEvents: "none",
    userSelect: "none",
  },
})

const kbdGroupStyles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: sizes.inputPadY,
  },
})

// ── Components ───────────────────────────────────────────────────────────────

type KbdProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function Kbd({ style, children, ref, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      ref={ref}
      {...stylex.props([kbdStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </kbd>
  )
}

type KbdGroupProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function KbdGroup({ style, children, ref, ...props }: KbdGroupProps) {
  return (
    <kbd
      data-slot="kbd-group"
      ref={ref}
      {...stylex.props([kbdGroupStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </kbd>
  )
}
