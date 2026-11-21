"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "vaul";
import { Menu } from "lucide-react";

/** The office menu on phones and tablets: slides in from the left, can be swiped away, closes after navigating. */
export function MobileDrawer({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <Drawer.Root direction="left" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button type="button" aria-label={label} className="sh-burger">
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] outline-none">
          <Drawer.Title className="sr-only">{label}</Drawer.Title>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
