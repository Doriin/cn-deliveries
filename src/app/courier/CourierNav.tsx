"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, Route, ScanLine, Wallet } from "lucide-react";

export function CourierNav({ labels, route }: { labels: { today: string; scan: string; cash: string }; route?: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/courier", label: labels.today, Icon: route ? Route : ListTodo, active: path === "/courier" || path.startsWith("/courier/s/") },
    { href: "/courier/scan", label: labels.scan, Icon: ScanLine, active: path.startsWith("/courier/scan") || path.startsWith("/courier/find") },
    { href: "/courier/cash", label: labels.cash, Icon: Wallet, active: path.startsWith("/courier/cash") },
  ];
  return (
    <nav className="cr-nav">
      {items.map(({ href, label, Icon, active }) => (
        <Link key={href} href={href} aria-current={active ? "page" : undefined} className="cr-tab">
          <span className="cr-tab-ico">
            <Icon aria-hidden />
          </span>
          <span className="cr-tab-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
