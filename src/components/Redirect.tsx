import { useEffect } from "react";
import { useNavigate } from "react-router";

interface RedirectProps {
	to: string;
	replace?: boolean;
	delay?: number; // Optional delay in milliseconds
}

const Redirect = ({ to, replace = true, delay = 0 }: RedirectProps) => {
	const navigate = useNavigate();

	useEffect(() => {
		const timeout = setTimeout(() => {
			navigate(to, { replace });
		}, delay);

		return () => clearTimeout(timeout);
	}, [to, replace, delay, navigate]);

	return null;
};

export default Redirect;
