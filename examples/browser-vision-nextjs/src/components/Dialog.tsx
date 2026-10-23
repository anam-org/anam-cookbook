"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

/**
 * A modal that marks the rest of the app inert while it's open, like Radix
 * and Headless UI do. Sightline skips inert content, so the persona only sees
 * the dialog. The avatar dock sits outside #app and stays usable.
 */
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const app = document.getElementById("app");
    app?.setAttribute("inert", "");
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      app?.removeAttribute("inert");
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="mb-4 text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
