"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** A table row that opens its shipment when clicked anywhere except on its own controls. */
export function RowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <tr
      className={className}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, input, label, select")) return;
        if (window.getSelection()?.toString()) return; // the user is copying text, not opening the row
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
