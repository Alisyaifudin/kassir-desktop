import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  background: "oklch(1 0 0)",
  foreground: "oklch(0.141 0.005 285.823)",
  card: "oklch(1 0 0)",
  cardForeground: "oklch(0.141 0.005 285.823)",
  popover: "oklch(1 0 0)",
  popoverForeground: "oklch(0.141 0.005 285.823)",
  primary: "oklch(0.21 0.006 285.885)",
  primaryForeground: "oklch(0.985 0 0)",
  secondary: "oklch(0.967 0.001 286.375)",
  secondaryForeground: "oklch(0.21 0.006 285.885)",
  muted: "oklch(0.967 0.001 286.375)",
  mutedForeground: "oklch(0.552 0.016 285.938)",
  accent: "oklch(0.967 0.001 286.375)",
  accentForeground: "oklch(0.21 0.006 285.885)",
  destructive: "oklch(0.577 0.245 27.325)",
  destructiveForeground: "oklch(0.985 0 0)",
  border: "oklch(0.92 0.004 286.32)",
  inputBorder: "oklch(0.92 0.004 286.32)",
  ring: "oklch(0.705 0.015 286.067)",
  shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  shadowSm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
});

export const sizes = stylex.defineVars({
  gap: "0.5rem",
  radiusSm: "calc(0.625rem - 2px)",
  radiusMd: "0.625rem",
  buttonPadY: "0.5rem",
  buttonPadX: "1rem",
});
