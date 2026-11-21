"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the day current like AutoRefresh, but never while a sheet is open:
 * the next stop must not change under a courier who is collecting a signature.
 */
export function HomeRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !document.querySelector("[data-vaul-drawer]")) router.refresh();
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
