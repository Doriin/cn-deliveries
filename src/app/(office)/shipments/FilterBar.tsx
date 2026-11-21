"use client";

import { useRef, type ReactNode } from "react";
import Form from "next/form";

/** Filters apply as soon as something changes: selects and dates at once, typing after a short pause. */
export function FilterBar({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const submit = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ref.current?.requestSubmit(), delay);
  };
  return (
    <Form
      ref={ref}
      action={action}
      replace
      scroll={false}
      className={className}
      onChange={(e) => {
        const el = e.target as HTMLElement;
        if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === "date")) submit(0);
      }}
      onInput={(e) => {
        const el = e.target as HTMLElement;
        if (el instanceof HTMLInputElement && (el.type === "search" || el.type === "text")) submit(350);
      }}
    >
      {children}
    </Form>
  );
}
