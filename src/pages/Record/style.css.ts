import { style } from "@vanilla-extract/css";

export const css = {
	bodyGrid: {
		big: style({
			gridTemplateColumns: "490px 1px 1fr",
		}),
		small: style({
			gridTemplateColumns: "335px 1px 1fr",
		}),
	},
	recordGrid: {
		big: {
			no: style({
				width: "30px",
			}),
			cashier: style({
				width: "150px",
			}),
			time: style({
				width: "120px",
			}),
		},
		small: {
			no: style({
				width: "10px",
			}),
			cashier: style({
				width: "90px",
			}),
			time: style({
				width: "93px",
			}),
		},
	},
	summary: {
		big: {
			small: style({
				width: "57px",
			}),
			big: style({
				width: "160px",
			}),
		},
		small: {
			small: style({
				width: "41px",
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
