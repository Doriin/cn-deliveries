"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintButton({ label, auto, variant }: { label: string; auto?: boolean; variant?: "primary" | "secondary" }) {
  return (
    <Button
      type="button"
      variant={variant}
      ref={(el) => {
        if (el && auto && !el.dataset.done) {
          el.dataset.done = "1";
          setTimeout(() => window.print(), 300);
        }
      }}
      onClick={() => window.print()}
      className="no-print"
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
