import { Context } from "effect";
import { Temporal } from "temporal-polyfill";

export class DateService extends Context.Tag("DateService")<
  DateService,
  {
    now: () => number;
    todayDate: () => Temporal.PlainDate;
    timeZoneId: () => string;
    today: {
      str: () => string;
    };
  }
>() {}
