import { newAction } from "./new";
import { deleteAction } from "./delete";
import { updateNameAction } from "./update-name";
import { updateRoleAction } from "./update-role";
import { auth } from "~/lib/auth";
import { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "new": {
      const error = await newAction(formdata);
      return { error, action };
    }
    case "delete": {
      const error = await deleteAction(formdata);
      return { error, action };
    }
    case "update-name": {
      const error = await updateNameAction(formdata);
      return { error, action };
    }
    case "update-role": {
      const error = await updateRoleAction(formdata);
      return { error, action };
    }
    default:
      throw new Error("Invalid action");
  }
}

export type Action = typeof action;
