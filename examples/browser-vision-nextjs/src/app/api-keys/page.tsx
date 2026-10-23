"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import {
  PageHeader,
  input,
  primaryButton,
  secondaryButton,
} from "@/components/ui";

const initialKeys = [
  { label: "production", access: "Full access", created: "12 Sep 2026" },
  { label: "analytics", access: "Read only", created: "3 Oct 2026" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(initialKeys);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function createKey(form: FormData) {
    const label = String(form.get("label") || "untitled");
    const access = String(form.get("access"));
    setKeys((current) => [...current, { label, access, created: "Today" }]);
    setCreating(false);
    setNotice(`API key "${label}" created.`);
  }

  function revokeKey(label: string) {
    setKeys((current) => current.filter((key) => key.label !== label));
    setNotice(`API key "${label}" revoked.`);
  }

  return (
    <>
      <PageHeader
        title="API keys"
        description="Keys let your servers call the Acme Cloud API."
        action={
          <button className={primaryButton} onClick={() => setCreating(true)}>
            Create API key
          </button>
        }
      />

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      <table className="w-full overflow-hidden rounded-xl border border-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Label</th>
            <th className="px-4 py-3 font-medium">Access</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.label} className="border-t border-zinc-200">
              <td className="px-4 py-3 font-medium">{key.label}</td>
              <td className="px-4 py-3 text-zinc-600">{key.access}</td>
              <td className="px-4 py-3 text-zinc-600">{key.created}</td>
              <td className="px-4 py-3 text-right">
                <button
                  className="text-sm font-medium text-red-600 hover:underline"
                  aria-label={`Revoke ${key.label}`}
                  onClick={() => revokeKey(key.label)}
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {creating && (
        <Dialog title="Create API key" onClose={() => setCreating(false)}>
          <form action={createKey} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Label
              <input name="label" required className={input} />
            </label>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1.5 font-medium">Access</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="access" value="Read only" defaultChecked />
                Read only
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="access" value="Full access" />
                Full access
              </label>
            </fieldset>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButton}>
                Create key
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
