import { Loader2 } from "lucide-react";

export function Loading() {
  return (
    <div className="flex items-center justify-center flex-1 w-full h-full">
      <Loader2 className="animate-spin size-5" />
    </div>
  );
}
