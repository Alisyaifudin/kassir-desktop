import { style } from "@vanilla-extract/css";

export const css = {
  delete: {
    big: {
      iconBtn: style({
        padding: "6px",
      }),
      grid: style({
        gridTemplateColumns: "200px 1fr",
      }),
    },
    small: {
      iconBtn: style({
        padding: "4px",
      }),
      grid: style({
        gridTemplateColumns: "100px 1fr",
      }),
    },
  },
  item: {
    big: style({
      gridTemplateColumns: "250px 1fr 60px",
    }),
    small: style({
      gridTemplateColumns: "200px 1fr 30px",
    }),
  },
  newItem: {
    big: style({
      gridTemplateColumns: "250px 1fr",
    }),
    small: style({
      gridTemplateColumns: "210px 1fr",
    }),
  },
  page: {
    big: style({
      gridTemplateColumns: "250px 1fr",
    }),
    small: style({
      gridTemplateColumns: "200px 1fr",
    }),
  },
};
