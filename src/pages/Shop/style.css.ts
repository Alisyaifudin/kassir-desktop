import { style } from "@vanilla-extract/css";

export const css = {
  right: {
    big: {
      minWidth: style({
        minWidth: "666px",
      }),
    },
    small: {
      minWidth: style({
        minWidth: "400px",
      }),
    },
  },
  output: {
    big: style({
      maxHeight: "calc(100vh - 200px)",
      top: "150px",
    }),
    small: style({
      maxHeight: "calc(100vh - 177px)",
      top: "125px",
    }),
  },
  header: {
    big: style({
      gridTemplateColumns: "70px 1fr 150px 230px 70px 150px 50px",
    }),
    small: style({
      gridTemplateColumns: "40px 1fr 100px 140px 40px 100px 30px",
    }),
  },
  grandTotal: {
    big: {
      grandTotal: style({
        fontSize: "128px",
        lineHeight: 0.8,
      }),
      container: style({
        paddingBottom: "36px",
      }),
    },
    small: {
      grandTotal: style({
        fontSize: "96px",
        lineHeight: 0.8,
      }),
      container: style({
        paddingBottom: "25px",
      }),
    },
  },
  discount: {
    big: style({
      gridTemplateColumns: "1fr 80px 150px 270px",
    }),
    small: style({
      gridTemplateColumns: "1fr 80px 130px 185px",
    }),
  },
  summary: {
    big: {
      grid: style({
        gridTemplateColumns: "160px 10px 1fr",
      }),
      change: style({
        fontSize: "96px",
        lineHeight: 1,
      }),
    },
    small: {
      grid: style({
        gridTemplateColumns: "120px 10px 1fr",
      }),
      change: style({
        fontSize: "60px",
        lineHeight: 1,
      }),
    },
  },
};
