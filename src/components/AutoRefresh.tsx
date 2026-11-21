"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps a page current without a reload button: refreshes when the tab is shown again and every `seconds` while visible. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);
  return null;
}
