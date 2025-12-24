import { style } from "@vanilla-extract/css";

export const css = {
  nav: {
    big: style({
      maxHeight: "calc(100vh - 68px)"
    }),
    small: style({
      maxHeight: "calc(100vh - 44px)"
    }),

  }
}