import { useEffect } from "react";
import { To, useNavigate } from "react-router";

interface RedirectProps {
  to: To;
  replace?: boolean;
  hard?: boolean;
}

const Redirect = ({ to, replace = true, hard = false }: RedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (hard) {
      window.location.pathname = to.toString();
    } else {
      navigate(to, { replace });
    }
  }, [to, replace, navigate, hard]);

  return null;
};

export default Redirect;
