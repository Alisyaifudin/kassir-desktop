import { style } from "@vanilla-extract/css";

export const css = {
	password: {
		big: style({
			gridTemplateColumns: "250px 1fr",
		}),
		small: style({
			gridTemplateColumns: "160px 1fr",
		}),
	},
};
