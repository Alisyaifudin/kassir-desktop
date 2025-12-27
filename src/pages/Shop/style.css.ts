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
      gridTemplateColumns: "70px 1fr 155px 230px 70px 150px 65px",
    }),
    small: style({
      gridTemplateColumns: "40px 1fr 105px 140px 40px 100px 45px",
    }),
  },
  discount: {
    big: style({
      gridTemplateColumns: "1fr 80px 150px 270px",
    }),
    small: style({
      gridTemplateColumns: "1fr 80px 130px 185px",
    }),
  },
};
