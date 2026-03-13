import { useEffect } from "react";
import { To, useNavigate } from "react-router";

interface RedirectProps {
  to: To;
  replace?: boolean;
}

const Redirect = ({ to, replace = true }: RedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);

  return null;
};

export default Redirect;
