import { ActionFunctionArgs } from "react-router";
import { nameAction } from "./change-name";
import { passwordAction } from "./change-password";

export async function action({ request }: ActionFunctionArgs) {
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "change-name": {
      const error = await nameAction(formdata);
      return { error, action };
    }
    case "change-password": {
      const error = await passwordAction(formdata);
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export type Action = typeof action;
