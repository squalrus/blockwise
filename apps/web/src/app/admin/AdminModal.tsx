"use client";

import { useEffect, useRef } from "react";

// Shared create/edit modal for the admin CRUD tabs (Challenges, Badges --
// super admin and neighborhood admin alike) -- native <dialog> rather than a
// hand-rolled overlay div: showModal()/close() give focus trapping,
// ESC-to-close, and a real ::backdrop for free, no extra dependency. onClose
// fires both from the × button and from the dialog's own native "close"
// event (ESC, or a <form method="dialog"> submit), so callers only need one
// handler to keep open-state in sync either way.
export function AdminModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-3xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-full text-lg font-bold text-muted hover:text-foreground"
        >
          ×
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-6 text-sm">{children}</div>
    </dialog>
  );
}
