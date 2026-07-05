import { useSyncExternalStore } from "react";
import { Effect } from "effect";
import { SocialService, SocialError } from "~/services/social";
import type { Social } from "~/services/social/type";
import type { Listener } from "~/lib/state";

// ---------------------------------------------------------------------------
// Types & default data
// ---------------------------------------------------------------------------

export interface TestSocial {
  id: string;
  name: string;
  value: string;
  updatedAt: number;
}

export const defaultSocials: TestSocial[] = [
  { id: "1", name: "Instagram", value: "@tokokita", updatedAt: 1 },
  { id: "2", name: "WhatsApp", value: "08123456789", updatedAt: 1 },
  { id: "3", name: "Facebook", value: "Toko Kita", updatedAt: 1 },
];

// ---------------------------------------------------------------------------
// Stateful mock — useSyncExternalStore-backed, mutations cause re-render
// ---------------------------------------------------------------------------

export class StatefullSocials {
  socials: TestSocial[];
  listeners = new Set<Listener>();

  constructor(socials?: TestSocial[]) {
    this.socials = socials ?? [...defaultSocials];
  }

  getSnapshot(): TestSocial[] {
    return this.socials;
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  useSocials(): Social[] {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }

  add(social: TestSocial) {
    this.socials = [...this.socials, social];
    this.notify();
  }

  delete(id: string) {
    this.socials = this.socials.filter((s) => s.id !== id);
    this.notify();
  }

  update(id: string, name: string, value: string) {
    this.socials = this.socials.map((s) =>
      s.id === id ? { ...s, name, value } : s,
    );
    this.notify();
  }

  reset(socials?: TestSocial[]) {
    this.socials = socials ?? [...defaultSocials];
    this.notify();
  }
}

// ---------------------------------------------------------------------------
// Mock service factory — wired to stateful store
// ---------------------------------------------------------------------------

export function makeSocialService(opts?: {
  loader?: () => Effect.Effect<void, SocialError>;
  state?: StatefullSocials;
  addError?: string;
  deleteError?: string;
  updateError?: string;
}): typeof SocialService.Service {
  const state = opts?.state ?? new StatefullSocials();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useSocials: () => state.useSocials(),
    add: (name, value) => {
      if (opts?.addError) {
        return Effect.fail(new SocialError(new Error(opts.addError)));
      }
      const newSocial: TestSocial = {
        name,
        value,
        id: Math.random().toString(36).slice(2),
        updatedAt: Date.now(),
      };
      state.add(newSocial);
      return Effect.void;
    },
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new SocialError(new Error(opts.deleteError)));
      }
      state.delete(id);
      return Effect.void;
    },
    update: (input) => {
      if (opts?.updateError) {
        return Effect.fail(new SocialError(new Error(opts.updateError)));
      }
      state.update(input.id, input.name, input.value);
      return Effect.void;
    },
  };
}
