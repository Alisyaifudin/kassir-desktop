import { style } from "@vanilla-extract/css";

export const css = {
	bodyGrid: {
		big: style({
			gridTemplateColumns: "530px 1px 1fr",
		}),
		small: style({
			gridTemplateColumns: "350px 1px 1fr",
		}),
	},
	recordGrid: {
		big: {
			no: style({
				width: "30px",
			}),
			cashier: style({
				width: "200px",
			}),
		},
		small: {
			no: style({
				width: "10px",
			}),
			cashier: style({
				width: "100px",
			}),
		},
	},
	summary: {
		big: {
			small: style({
				width: "70px",
			}),
			big: style({
				width: "160px",
			}),
		},
		small: {
			small: style({
				width: "40px",
			}),
			big: style({
				width: "100px",
			}),
		},
	},
	footer: {
		big: style({
			gridTemplateColumns: "1fr 220px",
		}),
		small: style({
			gridTemplateColumns: "1fr 170px",
		}),
	},
};
