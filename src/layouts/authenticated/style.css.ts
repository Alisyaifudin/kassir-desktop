import { style } from "@vanilla-extract/css";

export const css = {
	title: {
		big: {
			div: style({
				paddingBottom: "16px",
			}),
			p: style({
				fontSize: "48px",
				lineHeight: 1,
				fontStyle: "italic",
			}),
		},
		small: {
			div: style({
				paddingBottom: "8px",
			}),
			p: style({
				fontSize: "30px",
				lineHeight: 1.2,
				fontStyle: "italic",
			}),
		},
	},
	setting: {
		big: style({
			height: "60px",
		}),
		small: style({
			height: "35px",
		}),
	},
	navlist: {
		big: style({
			gap: "20px",
			paddingTop: "8px",
		}),
		small: style({ gap: "10px", paddingTop: "4px" }),
	},
	navlink: {
		big: style({
			paddingBlock: "12px",
		}),
		small: style({
			paddingBlock: "4px",
		}),
	},
};
