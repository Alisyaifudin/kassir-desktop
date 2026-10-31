import { useEffect } from "react";
import { createPath, type To } from "react-router";
import { Effect } from "effect";
import { useNavigate } from "~/services/route/react";
import { route } from "~/services/route/instance";

interface RedirectProps {
  to: To;
  hard?: boolean;
}

const Redirect = ({ to, hard = false }: RedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    const path = typeof to === "string" ? to : createPath(to);

    // Soft navigation works for both browser and hash routers. A redirect is not a
    // screen the operator chose, so it replaces the entry it interrupted: pushing
    // would leave the wall that bounced them here one `Back` away, and the guard
    // would bounce them straight back.
    if (!hard) {
      navigate(path, { behavior: "replace" });
      return;
    }

    // Hard redirect: the reload takes the session with it, so the stack is written
    // *before* it and starts again from the screen we land on. Without this, the
    // screen that failed would still sit behind the new one, and `Back` would walk
    // the operator into the failure it just escaped.
    Effect.runSync(route.reset(path));
    // Hash router: the route lives in the fragment. `navigate` is async on data
    // routers, so set the fragment directly (pathname + search + hash), then
    // reload for a clean slate.
    window.location.hash = path.startsWith("/") ? path : `/${path}`;
    window.location.reload();
  }, [to, navigate, hard]);

  return null;
};

export default Redirect;
