import { style } from "@vanilla-extract/css";

export const css = {
	grid: {
		big: style({
			gridTemplateColumns: "120px 1fr",
		}),
		small: style({
			gridTemplateColumns: "80px 1fr",
		}),
	},
};
