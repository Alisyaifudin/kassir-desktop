import { Effect } from "effect";
import { ResponseError } from "./effect-error";

export const responseError = {
  withCode(e: ResponseError) {
    return Effect.promise(async () => {
      try {
        const errMsg = await e.response.text();
        return { message: errMsg, code: e.response.status };
      } catch (error) {
        console.error(error);
        return { message: "Server bermasalah", code: e.response.status };
      }
    });
  },
  text(e: ResponseError) {
    return Effect.promise(async () => {
      try {
        const errMsg = await e.response.text();
        return errMsg;
      } catch (error) {
        console.error(error);
        return "Server bermasalah";
      }
    });
  },
  failMsg(e: ResponseError) {
    return Effect.promise(async () => {
      try {
        const errMsg = await e.response.text();
        console.log("error message", errMsg);
        return errMsg;
      } catch (error) {
        console.error(error);
        return "Server bermasalah";
      }
    }).pipe(Effect.flatMap((res) => Effect.fail(res)));
  },
  fail(e: ResponseError) {
    return Effect.promise(async () => {
      try {
        const errMsg = await e.response.text();
        return { message: errMsg, code: e.response.status };
      } catch (error) {
        console.error(error);
        return { message: "Server bermasalah", code: e.response.status };
      }
    }).pipe(Effect.flatMap((res) => Effect.fail(res)));
  },
};
