import { ActionFunctionArgs, redirect } from "react-router";
import { freshAction } from "./fresh";
import { loginAction } from "./login";
import { auth } from "~/lib/auth";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.get();
  if (user !== undefined) {
    throw redirect("/setting");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "fresh": {
      const error = await freshAction(formdata);
      return {
        action,
        error,
      } as const;
    }
    case "login": {
      const error = await loginAction(formdata);
      return {
        action,
        error,
      } as const;
    }
    default:
      throw new Error("Invalid action");
  }
}

export type Action = typeof action;
