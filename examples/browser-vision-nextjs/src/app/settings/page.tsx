"use client";

import { useState } from "react";
import { PageHeader, input, primaryButton } from "@/components/ui";

export default function SettingsPage() {
  const [emails, setEmails] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your workspace."
      />

      <section className="mb-8 max-w-lg rounded-xl border border-zinc-200 p-6">
        <h2 className="mb-4 font-semibold">General</h2>
        <form
          action={() => setSaved(true)}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Workspace name
            <input name="workspace" defaultValue="Acme" className={input} />
          </label>
          <div className="flex items-center justify-between text-sm">
            <span id="emails-label" className="font-medium">
              Email notifications
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={emails}
              aria-labelledby="emails-label"
              onClick={() => setEmails(!emails)}
              className="relative h-6 w-11 rounded-full bg-zinc-300 transition-colors aria-checked:bg-indigo-600"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${emails ? "left-5.5" : "left-0.5"}`}
              />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className={primaryButton}>
              Save changes
            </button>
            {saved && (
              <p role="status" className="text-sm text-emerald-700">
                Settings saved.
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="max-w-lg rounded-xl border border-red-200 p-6">
        <h2 className="mb-1 font-semibold text-red-700">Danger zone</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Deleting the workspace removes every project and key.
        </p>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          Delete workspace
        </button>
      </section>
    </>
  );
}
