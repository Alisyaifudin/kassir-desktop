import * as stylex from "@stylexjs/stylex";
import { colors, sizes } from "./tokens.stylex";

export const darkTheme = stylex.createTheme(colors, {
  background: "oklch(0.141 0.005 285.823)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.21 0.006 285.885)",
  cardForeground: "oklch(0.985 0 0)",
  popover: "oklch(0.21 0.006 285.885)",
  popoverForeground: "oklch(0.985 0 0)",
  primary: "oklch(0.92 0.004 286.32)",
  primaryForeground: "oklch(0.21 0.006 285.885)",
  secondary: "oklch(0.274 0.006 286.033)",
  secondaryForeground: "oklch(0.985 0 0)",
  muted: "oklch(0.274 0.006 286.033)",
  mutedForeground: "oklch(0.705 0.015 286.067)",
  accent: "oklch(0.274 0.006 286.033)",
  accentForeground: "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  destructiveForeground: "oklch(0.985 0 0)",
  border: "oklch(1 0 0 / 10%)",
  inputBorder: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.552 0.016 285.938)",
  shadow: "0 1px 3px 0 rgb(255 255 255 / 0.05), 0 1px 2px -1px rgb(255 255 255 / 0.05)",
  shadowSm: "0 1px 2px 0 rgb(255 255 255 / 0.03)",
});

export const bigTheme = stylex.createTheme(sizes, {
  gapSm: "0.75rem",
  radiusSm: "calc(0.75rem - 2px)",
  radiusMd: "0.75rem",
  buttonPadY: "0.75rem",
  buttonPadX: "1.5rem",
  accordionPadY: "1.25rem",
  iconSize: "1.25rem",
  checkboxSize: "1.75rem",
  borderWidth: 1,
  comboboxContentMaxH: "26rem",
});
