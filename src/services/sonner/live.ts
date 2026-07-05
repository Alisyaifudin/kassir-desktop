import { Layer } from "effect";
import { SonnerService } from ".";
import { toast } from "sonner";

export const sonnerLive = Layer.succeed(SonnerService, {
  error(message) {
    toast.error(message);
  },
  success(message) {
    toast.success(message);
  },
});
