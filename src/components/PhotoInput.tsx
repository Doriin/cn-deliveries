"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";

/** Downscales a camera photo to max 1600 px JPEG so uploads stay small on mobile data. */
async function compress(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.75));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PhotoInput({ onChange, label, retakeLabel }: { onChange: (f: File | null) => void; label: string; retakeLabel: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const url = useRef<string | null>(null);
  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);
  return (
    <label className="cr-photo cr-tap">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const small = await compress(f);
          if (url.current) URL.revokeObjectURL(url.current);
          url.current = URL.createObjectURL(small);
          setPreview(url.current);
          onChange(small);
        }}
      />
      {preview ? (
        <div className="cr-photo-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" />
          <span className="cr-chip">
            <RotateCcw aria-hidden />{retakeLabel}
          </span>
        </div>
      ) : (
        <div className="cr-photo-empty">
          <Camera aria-hidden />
          {label}
        </div>
      )}
    </label>
  );
}
