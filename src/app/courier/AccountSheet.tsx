"use client";

import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/courier/Sheet";

/** Language, design and log out live behind the avatar, so the top of the screen stays calm while driving. */
export function AccountSheet({ initials, name, role, title, closeLabel, children }: { initials: string; name: string; role: string; title: string; closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={title} aria-haspopup="dialog" onClick={() => setOpen(true)} className="cr-me cr-tap">
        <span>{initials}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={title} closeLabel={closeLabel}>
        <div className="cr-account">
          <div className="cr-who">
            <span className="cr-who-mark" aria-hidden>{initials}</span>
            <div>
              <b>{name}</b>
              <span>{role}</span>
            </div>
          </div>
          {children}
        </div>
      </Sheet>
    </>
  );
}
