import { useEffect } from "react";
import { createPath, useNavigate, type To } from "react-router";

interface RedirectProps {
  to: To;
  replace?: boolean;
  hard?: boolean;
}

const Redirect = ({ to, replace = true, hard = false }: RedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Soft navigation works for both browser and hash routers.
    if (!hard) {
      navigate(to, { replace });
      return;
    }

    // Hash router: the route lives in the fragment. `navigate` is async on data
    // routers, so set the fragment directly (pathname + search + hash), then
    // reload for a clean slate.
    const path = typeof to === "string" ? to : createPath(to);
    window.location.hash = path.startsWith("/") ? path : `/${path}`;
    window.location.reload();
  }, [to, replace, navigate, hard]);

  return null;
};

export default Redirect;
