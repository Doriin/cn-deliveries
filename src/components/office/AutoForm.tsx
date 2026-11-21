"use client";

import { useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

/** Filter bar that applies itself: changing a field updates the page, no "Show" button to press. */
export function AutoForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const go = (form: HTMLFormElement) => {
    const qs = new URLSearchParams();
    let partial = false;
    new FormData(form).forEach((v, k) => {
      if (typeof v !== "string" || !v) return;
      // A date being typed passes through years like 0002; wait until it is a real one.
      if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v < "2000-01-01") partial = true;
      qs.set(k, v);
    });
    if (!partial) start(() => router.replace(`${path}?${qs}`, { scroll: false }));
  };
  return (
    <form
      className={className}
      aria-busy={pending}
      onChange={(e) => go(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        go(e.currentTarget);
      }}
    >
      {children}
      {pending && <Spinner className="text-brand-600" />}
    </form>
  );
}
