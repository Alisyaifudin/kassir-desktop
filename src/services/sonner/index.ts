import { Context } from "effect";

export class SonnerService extends Context.Tag("SonnerService")<
  SonnerService,
  {
    error: (message: string) => void;
    success: (message: string) => void;
  }
>() {}
