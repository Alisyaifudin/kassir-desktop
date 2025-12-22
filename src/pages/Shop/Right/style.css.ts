import { style } from "@vanilla-extract/css";

export const css = {
  tab: {
    big: style({
      width: "60px",
    }),
    small: style({
      width: "50px",
    }),
  },
  grandTotal: {
    big: {
      loading: style({
        height: "128px",
      }),
      grandTotal: style({
        fontSize: "128px",
        lineHeight: 0.8,
      }),
      container: style({
        paddingBottom: "36px",
      }),
    },
    small: {
      loading: style({
        height: "76px",
      }),
      grandTotal: style({
        fontSize: "96px",
        lineHeight: 0.8,
      }),
      container: style({
        paddingBottom: "25px",
      }),
    },
  },
  additional: {
    big: {
      percent: style({
        gridTemplateColumns: "30px 200px 70px 110px 200px 50px",
      }),
      number: style({
        gridTemplateColumns: "30px 275px 110px 35px 160px 50px",
      }),
    },
    small: {
      percent: style({
        gridTemplateColumns: "30px 100px 70px 110px 100px 50px",
      }),
      number: style({
        gridTemplateColumns: "30px 100px 90px 35px 120px 50px",
      }),
    },
  },
  item: {
    big: {
      loading: style({
        height: "62px",
      }),
      topLevel: style({
        gridTemplateColumns: "70px 1fr",
      }),
      inside: style({
        gridTemplateColumns: "1fr 150px 230px 70px 150px 50px",
      }),
    },
    small: {
      loading: style({
        height: "58px",
      }),
      topLevel: style({
        gridTemplateColumns: "40px 1fr",
      }),
      inside: style({
        gridTemplateColumns: "1fr 100px 140px 40px 100px 30px",
      }),
    },
  },
};
