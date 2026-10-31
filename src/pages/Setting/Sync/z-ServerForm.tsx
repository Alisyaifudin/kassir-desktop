import { Effect, Stream } from "effect";
import { useEffect, useState } from "react";
import { useQuery, useStream } from "~/components/Loader";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { service } from "~/services";
import type { SyncConfig } from "~/services/sync";

/** A merge needs both halves: an endpoint to call and a token to call it with. */
function isConfigured(config: SyncConfig): boolean {
  return config.baseUrl.trim() !== "" && config.token.trim() !== "";
}

/**
 * The server this device syncs with (contract §10).
 *
 * The values live in `store.json` under `sync.base_url` / `sync.token` — the same
 * store the cursors use. There is no account and no login: one token protects the
 * whole endpoint, and the desktop is its only participant.
 *
 * The token is rendered as a password field but is not masked in the store: it is
 * a shared secret for a single-tenant endpoint, and hiding it on screen while
 * leaving it in cleartext on disk would be security theatre.
 */
export function ServerForm({
  onConfigured,
}: {
  /** Reports whether a server + token are stored, so the run button can gate on it. */
  onConfigured?: (configured: boolean) => void;
}) {
  const loaded = useQuery(() => Stream.fromEffect(service.sync.config.get()), []);
  const [form, setForm] = useState<SyncConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the fields once the stored config arrives, without fighting later edits.
  useEffect(() => {
    if (loaded.type === "success" && form === null) {
      setForm(loaded.data);
      onConfigured?.(isConfigured(loaded.data));
    }
  }, [loaded, form, onConfigured]);

  if (form === null) return <Spinner when />;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (form === null) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const outcome = await Effect.runPromise(
      service.sync.config.set(form).pipe(Effect.either),
    );
    setSaving(false);
    if (outcome._tag === "Left") {
      setError(outcome.left.message);
    } else {
      setSaved(true);
      onConfigured?.(isConfigured(form));
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="grid grid-cols-1 gap-1 text-base sm:grid-cols-[140px_1fr] sm:items-center sm:gap-2">
        <span>Alamat server</span>
        <Input
          value={form.baseUrl}
          onChange={(event) => {
            const baseUrl = event.currentTarget.value;
            setSaved(false);
            setForm({ ...form, baseUrl });
          }}
          placeholder="https://kassir.example.workers.dev"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label className="grid grid-cols-1 gap-1 text-base sm:grid-cols-[140px_1fr] sm:items-center sm:gap-2">
        <span>Token</span>
        <Input
          type="password"
          value={form.token}
          onChange={(event) => {
            const token = event.currentTarget.value;
            setSaved(false);
            setForm({ ...form, token });
          }}
          placeholder="SYNC_TOKEN"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={saving}>
          Simpan <Spinner when={saving} />
        </Button>
        {saved ? <p className="text-sm text-muted-foreground">Tersimpan</p> : null}
      </div>
      <TextError>{error}</TextError>
    </form>
  );
}

/** The pull cursor, read once per mount (it only moves while a run is active). */
export function CursorLine() {
  const cursor = useStream(Stream.fromEffect(service.sync.cursor()));
  const value = cursor.type === "success" ? cursor.data : null;
  return (
    <p className="text-sm text-muted-foreground">
      {value === null ? "Belum pernah sinkron" : `Terakhir menerima sampai urutan ${value}`}
    </p>
  );
}
