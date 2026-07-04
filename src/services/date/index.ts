import { Context } from "effect";

export class DateService extends Context.Tag("DateService")<
  DateService,
  {
    today: {
      str: () => string;
    };
  }
>() {}
