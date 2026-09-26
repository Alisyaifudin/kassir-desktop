import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function Image({ srcs }: { srcs: string[] }) {
  const [selected, setSelected] = useState(srcs[0]);
  const index = srcs.findIndex((src) => src === selected);
  const handlePrev = () => {
    if (index <= 0) {
      return;
    }
    setSelected(srcs[index - 1]);
  };
  const handleNext = () => {
    if (index + 1 >= srcs.length) {
      return;
    }
    setSelected(srcs[index + 1]);
  };
  const handleClick = (index: number) => () => {
    setSelected(srcs[index]);
  };
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex flex-1">
        <div className="flex-1 justify-center items-center flex">
          <Button
            className="h-full px-0"
            variant="secondary"
            onClick={handlePrev}
            disabled={index <= 0}
            type="button"
          >
            <ChevronLeft />
          </Button>
          <div className="relative flex-1 flex justify-center items-center">
            <img className="object-contain h-full" src={selected} />
          </div>
          <Button
            className="h-full px-0"
            variant="secondary"
            disabled={index === srcs.length - 1}
            onClick={handleNext}
            type="button"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="flex flex-col w-full h-36 ">
        <div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
          {srcs.map((src, i) => (
            <button
              type="button"
              key={i}
              className={"h-32 aspect-square p-0.5"}
              onClick={handleClick(i)}
            >
              <img
                className={cn("object-contain w-full h-full", {
                  outline: selected === src,
                })}
                src={src}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
