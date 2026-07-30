import { Effect } from "effect";
import { useEffect } from "react";
import { RouterService, To } from "~/services/router";

interface RedirectProps {
  to: To;
  replace?: boolean;
  hard?: boolean;
}

export const redirect = Effect.gen(function* () {
  const routerService = yield* RouterService;
  const useNavigate = () => routerService.useNavigate();
  return function Redirect({ to, replace = true, hard = false }: RedirectProps) {
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
});
