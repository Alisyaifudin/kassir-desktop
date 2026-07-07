import { Context } from "effect";
import { Ref } from "react";

export class ScrollService extends Context.Tag("ScrollService")<
  ScrollService,
  {
    useScroll(id: string): [Ref<HTMLElement>, () => void];
  }
>() {}
