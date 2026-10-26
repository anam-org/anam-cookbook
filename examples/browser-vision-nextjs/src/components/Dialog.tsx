"use client";

import { useEffect, useEffectEvent, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A modal that marks the rest of the app inert while it's open, like Radix
 * and Headless UI do. Sightline skips inert content, so the persona only sees
 * the dialog. Close the dialog before using the avatar dock.
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement;
    const background = [...document.querySelectorAll<HTMLElement>(
      "#app, [data-avatar-dock]"
    )].map((element) => ({ element, wasInert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]'
    )].filter((element) => element.tabIndex >= 0 &&
      !element.matches(":disabled") && element.getClientRects().length > 0);
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    focusFirst();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      background.forEach(({ element, wasInert }) => { element.inert = wasInert; });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl bg-white p-6 shadow-xl"
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
