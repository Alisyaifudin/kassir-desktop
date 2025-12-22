import { style } from "@vanilla-extract/css";

export const css = {
  grid: {
    big: style({
      gridTemplateColumns: "160px 10px 1fr",
    }),
    small: style({
      gridTemplateColumns: "120px 10px 1fr",
    }),
  },
  change: {
    big: style({
      fontSize: "96px",
      lineHeight: 1,
    }),
    small: style({
      fontSize: "60px",
      lineHeight: 1,
    }),
  },
};
