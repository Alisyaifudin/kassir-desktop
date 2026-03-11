import { style } from "@vanilla-extract/css";

export const css = {
  footer: {
    big: style({
      gridTemplateColumns: "1fr 220px",
    }),
    small: style({
      gridTemplateColumns: "1fr 170px",
    }),
  },
};
