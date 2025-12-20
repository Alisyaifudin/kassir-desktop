import { style } from "@vanilla-extract/css";

export const css = {
  big: style({
    gridTemplateColumns: "300px 1fr",
  }),
  small: style({
    gridTemplateColumns: "200px 1fr",
  }),
};
