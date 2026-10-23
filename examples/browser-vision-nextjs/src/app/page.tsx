"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import {
  PageHeader,
  input,
  primaryButton,
  secondaryButton,
} from "@/components/ui";

const initialProjects = [
  { name: "marketing-site", region: "London", status: "Running" },
  { name: "checkout-api", region: "Frankfurt", status: "Running" },
  { name: "image-worker", region: "Virginia", status: "Paused" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);

  function createProject(form: FormData) {
    const name = String(form.get("name") || "untitled");
    const region = String(form.get("region"));
    setProjects((current) => [...current, { name, region, status: "Running" }]);
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Everything you deploy lives in a project."
        action={
          <button className={primaryButton} onClick={() => setCreating(true)}>
            New project
          </button>
        }
      />

      <table className="w-full overflow-hidden rounded-xl border border-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Region</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.name} className="border-t border-zinc-200">
              <td className="px-4 py-3 font-medium">{project.name}</td>
              <td className="px-4 py-3 text-zinc-600">{project.region}</td>
              <td className="px-4 py-3 text-zinc-600">{project.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {creating && (
        <Dialog title="New project" onClose={() => setCreating(false)}>
          <form action={createProject} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Project name
              <input name="name" required className={input} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Region
              <select name="region" className={input}>
                <option>London</option>
                <option>Frankfurt</option>
                <option>Virginia</option>
              </select>
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButton}>
                Create project
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
