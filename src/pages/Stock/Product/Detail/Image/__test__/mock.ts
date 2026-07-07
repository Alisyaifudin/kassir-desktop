import { Effect } from "effect";
import { ImageService } from "~/services/image";
import { ImageError } from "~/services/image/error";
import type { ImageResult } from "~/services/image/type";
import { UserService } from "~/services/user";

// ── Default fixtures ──────────────────────────────────────────

export const defaultImages: ImageResult[] = [
  { success: true, href: "blob:img-1", order: 0, id: "img-1" },
  { success: true, href: "blob:img-2", order: 1, id: "img-2" },
];

// ── ImageService mock ────────────────────────────────────────

export function makeImageService(opts?: {
  loader?: () => Effect.Effect<void, ImageError>;
  images?: ImageResult[];
  addError?: string;
  deleteError?: string;
}): typeof ImageService.Service {
  const images = opts?.images ?? defaultImages;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useImages: () => images,
    add: () => {
      if (opts?.addError) return Effect.fail(new ImageError(new Error(opts.addError)));
      return Effect.void;
    },
    delete: () => {
      if (opts?.deleteError) return Effect.fail(new ImageError(new Error(opts.deleteError)));
      return Effect.void;
    },
    swap: () => Effect.void,
  };
}

// ── UserService mock ──────────────────────────────────────────

export function makeUserService(opts?: {
  role?: DBNamespace.Role;
}): typeof UserService.Service {
  const user = { name: "Admin", role: opts?.role ?? "admin", id: "u-1" };
  return {
    loader: () => Effect.void,
    useUser: () => user,
    user,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}
