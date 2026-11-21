"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Confirms the parcel just saved, then cleans ?done= from the address so a refresh doesn't repeat it. */
export function DoneToast({ message, id }: { message: string; id: string }) {
  const router = useRouter();
  useEffect(() => {
    toast.success(message, { id: `done-${id}` });
    router.replace("/courier", { scroll: false });
  }, [message, id, router]);
  return null;
}
