"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, Search } from "lucide-react";
import { extractTracking } from "@/lib/courier";
import { Alert, Button, Input, Spinner, btnClass, cx } from "@/components/ui";

type CameraState = "starting" | "live" | "insecure" | "unavailable";

/**
 * Live camera scanning needs HTTPS (or localhost). Over plain http on a phone the browser blocks the camera,
 * so we fall back to taking a photo of the label and decoding it.
 */
export function Scanner() {
  const t = useTranslations("courier");
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraState>("starting");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (tracking: string) => {
    try {
      navigator.vibrate?.(30);
    } catch {}
    setError(null);
    setBusy(true);
    router.push(`/courier/find?t=${encodeURIComponent(tracking)}`);
  };
  const go = (text: string) => {
    const tracking = extractTracking(text);
    if (!tracking) {
      setError(t("scanNoCode"));
      return false;
    }
    open(tracking);
    return true;
  };

  useEffect(() => {
    if (!window.isSecureContext) return setCamera("insecure");
    if (!navigator.mediaDevices?.getUserMedia) return setCamera("unavailable");
    let controls: IScannerControls | undefined;
    let stopped = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, video.current!, (result, _err, c) => {
        if (result && !stopped && extractTracking(result.getText())) {
          stopped = true;
          c.stop();
          go(result.getText());
        }
      })
      .then((c) => {
        controls = c;
        if (stopped) c.stop();
        else setCamera("live");
      })
      .catch(() => setCamera("unavailable"));
    return () => {
      stopped = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = camera === "live";
  return (
    <div className="cr-scan">
      <div className="cr-cam" data-live={live || undefined}>
        <video ref={video} className="cr-cam-video" muted playsInline />
        {live ? (
          <div className="cr-cam-frame" aria-hidden>
            <span /><span /><span /><span />
            <i className="animate-scanline" />
          </div>
        ) : (
          <div className="cr-cam-msg">
            {camera === "starting" ? (
              <>
                <Spinner className="h-7 w-7" />
                {t("scanStarting")}
              </>
            ) : (
              <>
                <CameraOff aria-hidden />
                {t(camera === "insecure" ? "scanNoHttps" : "scanNoCamera")}
              </>
            )}
          </div>
        )}
        {busy && (
          <div className="cr-cam-busy" role="status">
            <Spinner className="h-7 w-7" />
            {t("searching")}
          </div>
        )}
      </div>
      {live && <p className="cr-hint cr-cam-hint">{t("scanHint")}</p>}

      {error && <Alert>{error}</Alert>}

      <label className={cx(btnClass("primary", "lg"), "cr-go cr-file")} aria-disabled={busy || undefined}>
        <Camera aria-hidden />{t("scanPhoto")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const input = e.target;
            const f = input.files?.[0];
            if (!f) return;
            setError(null);
            setBusy(true);
            const url = URL.createObjectURL(f);
            try {
              const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
              if (!go(result.getText())) setBusy(false);
            } catch {
              setError(t("scanNoCode"));
              setBusy(false);
            } finally {
              URL.revokeObjectURL(url);
              input.value = ""; // lets the courier retake the same shot
            }
          }}
        />
      </label>

      <form
        className="cr-manual"
        onSubmit={(e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get("t") ?? "").trim();
          if (v) open(extractTracking(v) ?? v.toUpperCase());
        }}
      >
        <label htmlFor="scan-manual" className="cr-hint">{t("scanManual")}</label>
        <div>
          <Input
            id="scan-manual"
            name="t"
            placeholder="CN-261117-0001"
            aria-label={t("trackingNo")}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="cr-field cr-field-code flex-1"
          />
          <Button variant="secondary" size="lg" disabled={busy} className="cr-qbtn"><Search aria-hidden /><span>{t("find")}</span></Button>
        </div>
      </form>
    </div>
  );
}
