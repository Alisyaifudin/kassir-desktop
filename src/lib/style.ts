type Style = {
	text: React.CSSProperties;
	h1: React.CSSProperties;
	icon: number;
	checkbox: React.CSSProperties;
};

const big: Style = {
	text: {
		fontSize: "30px",
		lineHeight: 1.2,
	},
	h1: {
		fontSize: "36px",
		lineHeight: 1.11111,
	},
	checkbox: {
		width: "28px",
		height: "28px",
	},
	icon: 30,
};

const small: Style = {
	text: {
		fontSize: "20px",
		lineHeight: 1,
	},
	h1: {
		fontSize: "30px",
		lineHeight: 1.2,
	},
	checkbox: {
		width: "18px",
		height: "18px",
	},
	icon: 20,
};

export const style: { big: Style; small: Style } = {
	big,
	small,
};
