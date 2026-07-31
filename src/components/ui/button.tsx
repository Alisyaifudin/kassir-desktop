import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { ButtonBase } from "../block/button";
import { colors, sizes } from "~/tokens.stylex";
import type { ReactNode, Ref } from "react";

// ── Styles ───────────────────────────────────────────────────────────────────

export const buttonBaseStyle = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.gapSm,
    whiteSpace: "nowrap",
    borderRadius: sizes.radiusSm,
    fontWeight: 500,
    height: "fit-content",
    padding: `${sizes.buttonPadY} ${sizes.buttonPadX}`,
    transitionProperty: "color, background-color, border-color, box-shadow",
    transitionDuration: "150ms",
    ":focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 1px ${colors.ring}`,
    },
    ":disabled": {
      pointerEvents: "none",
      opacity: 0.5,
    },
  },
});

export const buttonColorVariants = stylex.create({
  default: {
    color: colors.primaryForeground,
    backgroundColor: colors.primary,
    boxShadow: colors.shadow,
    ":hover": {
      backgroundColor: `color-mix(in oklch, ${colors.primary} 90%, transparent)`,
    },
  },
  destructive: {
    color: colors.destructiveForeground,
    backgroundColor: colors.destructive,
    boxShadow: colors.shadowSm,
    ":hover": {
      backgroundColor: `color-mix(in oklch, ${colors.destructive} 90%, transparent)`,
    },
  },
  outline: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: colors.background,
    boxShadow: colors.shadowSm,
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
  secondary: {
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
    boxShadow: colors.shadowSm,
    ":hover": {
      backgroundColor: `color-mix(in oklch, ${colors.secondary} 80%, transparent)`,
    },
  },
  ghost: {
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
    ":active": {
      backgroundColor: "transparent",
    },
  },
});

// ── Component ────────────────────────────────────────────────────────────────

type ButtonProps = {
  variant?: keyof typeof buttonColorVariants;
  style?: StyleXStyles;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "default",
  style,
  children,
  onClick,
  disabled,
  ref,
}: ButtonProps) {
  const styles = [buttonBaseStyle.base, buttonColorVariants[variant], style] as StyleXStyles;
  return (
    <ButtonBase style={styles} onClick={onClick} disabled={disabled} ref={ref}>
      {children}
    </ButtonBase>
  );
}
