import { newAction } from "./new";
import { deleteAction } from "./delete";
import { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth";
import { submitAction } from "./submit";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.get();
  if (user === undefined) {
    throw new Error("Unauthenticated");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "new": {
      const error = await newAction();
      return { error, action };
    }
    case "delete": {
      const error = await deleteAction(formdata);
      return { error, action };
    }
    case "submit": {
      const error = await submitAction(formdata);
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}
export type Action = typeof action;
