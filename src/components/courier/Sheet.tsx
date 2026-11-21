"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";

/**
 * Bottom sheet for the courier app. Only the handle drags it, so scrolling a form or signing never moves the sheet.
 * It is drawn outside the courier layout (a portal), so its look hangs on the design alone: see courier.css.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  closeLabel,
  leading,
  locked,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  closeLabel: string;
  leading?: ReactNode;
  /** While saving: the sheet can't be swiped or tapped away. */
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} handleOnly dismissible={!locked}>
      <Drawer.Portal>
        <Drawer.Overlay className="cr-sheet-overlay" />
        <Drawer.Content aria-describedby={undefined} className="cr-sheet">
          <Drawer.Handle preventCycle className="cr-sheet-handle" />
          <div className="cr-sheet-head">
            {leading}
            <Drawer.Title className="cr-sheet-title">{title}</Drawer.Title>
            <Drawer.Close asChild>
              <button type="button" aria-label={closeLabel} className="cr-sheet-close cr-tap">
                <X aria-hidden />
              </button>
            </Drawer.Close>
          </div>
          <div className="cr-sheet-body">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
