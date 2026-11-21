"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import menu from "@iconify-icons/material-symbols/menu-rounded";
import menuOpen from "@iconify-icons/material-symbols/menu-open-rounded";

/** Opens Val's navigation rail into the expanded rail (labels beside icons) and remembers the choice on this browser. */
export function RailToggle({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(localStorage.getItem("vr-open") === "1"), []);
  useEffect(() => {
    document.querySelector(".sh-navrail")?.setAttribute("data-open", String(open));
    localStorage.setItem("vr-open", open ? "1" : "0");
  }, [open]);
  return (
    <button type="button" className="vr-menu" aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      <Icon icon={open ? menuOpen : menu} />
    </button>
  );
}
