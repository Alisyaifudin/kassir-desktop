import { style } from "@vanilla-extract/css";

export const css = {
  method: {
    big: style({
      width: "200px",
    }),
    small: style({
      width: "140px",
    }),
  },
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
      fontSize: "50px",
      lineHeight: 1,
    }),
  },
};
