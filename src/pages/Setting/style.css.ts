import { style } from "@vanilla-extract/css";

export const grid = {
	big: style({
		gridTemplateColumns: "300px 1fr",
	}),
	small: style({
		gridTemplateColumns: "150px 1fr",
	}),
};