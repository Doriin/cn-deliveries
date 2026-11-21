import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** The top of a courier screen: title, an optional figure on the right, and whatever the screen adds under them. */
export function CourierTop({ title, count, back, backLabel, children }: { title: ReactNode; count?: ReactNode; back?: string; backLabel?: string; children?: ReactNode }) {
  return (
    <header className="cr-top">
      <div className="cr-top-row">
        {back && (
          <Link href={back} aria-label={backLabel} className="cr-back cr-tap">
            <ArrowLeft aria-hidden />
          </Link>
        )}
        <h1 className="cr-title">{title}</h1>
        {count && <span className="cr-count">{count}</span>}
      </div>
      {children}
    </header>
  );
}
