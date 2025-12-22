import { newAction } from "./new";
import { editAction } from "./edit";
import { deleteAction } from "./delete";
import { auth } from "~/lib/auth";
import { ActionFunctionArgs } from "react-router";
import { updateDefaultAction } from "./update-default";

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
    case "update-default": {
      const error = await updateDefaultAction(formdata);
      return { error, action };
    }
    case "edit": {
      const error = await editAction(formdata);
      return { error, action };
    }
    case "delete": {
      const error = await deleteAction(formdata);
      return { error, action };
    }
    default:
      throw new Error("Invalid action");
  }
}

export type Action = typeof action;
