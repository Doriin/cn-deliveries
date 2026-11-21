"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Slides in at the top while the phone has no signal: nothing a courier taps is saved until it is back. */
export function OfflineBanner({ text }: { text: string }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return (
    <div role="status" aria-hidden={online} className="cr-offline" data-on={!online}>
      <div>
        <p>
          <WifiOff aria-hidden />
          {text}
        </p>
      </div>
    </div>
  );
}
