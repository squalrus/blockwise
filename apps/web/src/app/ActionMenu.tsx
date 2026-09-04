"use client";

import { useEffect, useRef, useState } from "react";

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  // Shown via the native title tooltip -- e.g. explaining why a disabled
  // item is blocked, mirroring the aria-disabled+title pattern this menu
  // replaced on the neighborhood-admin Locations rows.
  title?: string;
}

// Generic three-dot row-actions menu -- first used by the super-admin Users
// table (replacing its standalone "Send test push" button) but written
// generic so other admin/list rows can adopt the same pattern rather than
// each growing its own trigger button. Same open/outside-click/Escape
// handling as AccountMenu.tsx and AdminSwitcher.tsx's dropdowns.
export function ActionMenu({ items, label = "Actions" }: { items: ActionMenuItem[]; label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={label}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-card-alt hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="2.5" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13.5" r="1.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[170px] rounded-xl border border-border bg-card py-1.5 text-foreground shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}
              className={`block w-full truncate px-3.5 py-1.5 text-left text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
                item.destructive ? "text-red-600 dark:text-red-400" : "text-foreground"
              } hover:bg-card-alt`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
