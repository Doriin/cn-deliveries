import Link from "next/link";
import { LogOut, PackagePlus, Plus, ScanLine, Settings } from "lucide-react";
import type { IconSet, Shell } from "@/lib/design";
import type { Pulse } from "@/lib/pulse";
import { logout } from "@/app/actions/auth";
import { NavLinks } from "@/components/NavLinks";
import { NAV_ICONS, type NavItem } from "@/components/navIcons";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { MobileDrawer } from "@/components/MobileDrawer";
import { HeaderSearch } from "@/components/HeaderSearch";
import { LinkButton } from "@/components/ui";
import { NAV_ICONS as NAV_ICONS_SERVER } from "@/components/navIcons";
import { BarcodeIcon } from "@phosphor-icons/react/ssr";
import { UserMenu } from "./UserMenu";
import { Island } from "./Island";
import { TabBar } from "./TabBar";
import { CommandPalette } from "./CommandPalette";
import { GoKeys } from "./GoKeys";
import { RailToggle } from "./RailToggle";
import { RiAddLine, RiExpandUpDownLine } from "@remixicon/react";

/** The scan glyph in Insula's top bar (Phosphor, like its tab bar). */
const NavIconServer = ({ name }: { name: keyof typeof NAV_ICONS_SERVER }) => (name === "scan" ? <BarcodeIcon weight="bold" aria-hidden /> : null);

const NEW_KEY = { n: "/shipments/new" };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

type Props = {
  shell: Shell;
  icons: IconSet;
  /** Live figures for Insula's Dynamic Island. */
  pulse?: Pulse;
  /** Words only the three newer menus use. */
  extra: {
    more: string;
    island: { title: string; problems: string; allGood: string; at: string; idle: string; open: string; held: string; of: string };
    palette: { trigger: string; placeholder: string; go: string; actions: string; find: string; empty: string; close: string };
  };
  /** Daily work: shown in every menu. */
  main: NavItem[];
  /** Set-up pages: listed in the side menu, tucked into a menu elsewhere. */
  admin: NavItem[];
  user: { name: string; role: string };
  labels: { menu: string; search: string; scan: string; newShipment: string; logout: string; settings: string; language: string };
  children: React.ReactNode;
};

/**
 * The office frame. Each design picks one of four menus (top bar, side menu, floating capsule, rail);
 * below 1024px all of them become a compact bar with a slide-in menu.
 */
export function OfficeShell({ shell, icons, pulse, extra, main, admin, user, labels, children }: Props) {
  const all = [...main, ...admin];
  const search = <HeaderSearch placeholder={labels.search} />;
  const scan = (
    <LinkButton variant="secondary" href="/scan" aria-label={labels.scan} title={labels.scan} className="sh-only-icon sh-wide">
      <ScanLine className="h-4 w-4" aria-hidden /><span>{labels.scan}</span>
    </LinkButton>
  );
  const add = (
    <LinkButton href="/shipments/new" aria-label={labels.newShipment} title={labels.newShipment} className="sh-new">
      <PackagePlus className="h-4 w-4" aria-hidden /><span>{labels.newShipment}</span>
    </LinkButton>
  );
  const account = (
    <>
      <div className="sh-pop-who"><b>{user.name}</b><span>{user.role}</span></div>
      <div className="sh-pop-row"><span>{labels.language}</span><LocaleSwitcher /></div>
      <div className="sh-pop-sep" />
      <form action={logout}><button className="sh-pop-btn"><LogOut aria-hidden />{labels.logout}</button></form>
    </>
  );
  const adminLinks = admin.map((i) => {
    const Icon = NAV_ICONS[i.icon];
    return <Link key={i.href} href={i.href}><Icon aria-hidden />{i.label}</Link>;
  });
  const menu = (side: "down" | "up" = "down") => (
    <UserMenu label={user.name} trigger={initials(user.name)} side={side}>
      {account}
    </UserMenu>
  );
  const settingsMenu = admin.length > 0 && (
    <UserMenu label={labels.settings} triggerClass="sh-link" trigger={<><span className="sh-ico"><Settings aria-hidden /></span><span className="sh-lbl">{labels.settings}</span></>}>
      {adminLinks}
    </UserMenu>
  );

  const mobile = (
    <div className="sh-mobile no-print">
      <MobileDrawer label={labels.menu}>
        <div className="sh-drawer">
          <Logo />
          <NavLinks items={all} gaps icons={icons} />
          <div className="sh-drawer-foot">
            <div className="sh-pop-who" style={{ border: 0, margin: 0, padding: "0 0.5rem" }}><b>{user.name}</b><span>{user.role}</span></div>
            <div className="px-2"><LocaleSwitcher /></div>
            <form action={logout}><button className="sh-link" style={{ height: "2.75rem", padding: "0 0.75rem", width: "100%" }}><span className="sh-ico"><LogOut aria-hidden /></span>{labels.logout}</button></form>
          </div>
        </div>
      </MobileDrawer>
      <Link href="/" aria-label="CN Deliveries"><Logo /></Link>
      <div className="sh-right"><div className="sh-actions">{scan}{add}</div></div>
    </div>
  );

  /* Insula: a Dynamic Island on top, the menu as a floating glass tab bar at the bottom */
  if (shell === "island") {
    return (
      <div className="sh sh-island">
        {mobile}
        <header className="isl-top sh-desktop no-print">
          <Link href="/" className="isl-brand"><Logo size={32} /></Link>
          <div className="isl-slot">{pulse && <Island pulse={pulse} labels={extra.island} />}</div>
          <div className="isl-acts">
            <Link href="/scan" className="isl-round" aria-label={labels.scan} title={labels.scan}><NavIconServer name="scan" /></Link>
            <LinkButton href="/shipments/new" className="isl-new"><Plus aria-hidden /><span>{labels.newShipment}</span></LinkButton>
            {menu()}
          </div>
        </header>
        <main className="sh-main">{children}</main>
        <div className="sh-desktop"><TabBar main={main} admin={admin} moreLabel={extra.more} search={search} /></div>
      </div>
    );
  }

  /* Radar: a floating vertical dock that opens into labels on hover, tools floating top right */
  if (shell === "dock") {
    return (
      <div className="sh sh-dock">
        {mobile}
        <header className="rd-top sh-desktop no-print">
          <Link href="/" className="rd-brand"><Logo size={30} /></Link>
          <div className="rd-tools">
            {search}
            <Link href="/scan" className="rd-tool" aria-label={labels.scan} title={labels.scan}><ScanLine aria-hidden /></Link>
            <LinkButton href="/shipments/new" className="rd-new"><Plus aria-hidden /><span>{labels.newShipment}</span></LinkButton>
            {menu()}
          </div>
        </header>
        <aside className="rd-dock sh-desktop no-print">
          <NavLinks items={main} all={all} icons={icons} />
          <span className="rd-dock-sep" aria-hidden />
          <NavLinks items={admin} all={all} icons={icons} />
        </aside>
        <main className="sh-main">{children}</main>
      </div>
    );
  }

  /* Triaj: a quiet sidebar with a workspace header, a command line and two-key jumps */
  if (shell === "inbox") {
    const keys: Record<string, string> = { dashboard: "i", shipments: "s", scan: "b", manifest: "m", cod: "c", clients: "k", sync: "g", users: "u", zones: "z", design: "d" };
    const map = Object.fromEntries(all.map((i) => [keys[i.icon] ?? "", i.href]).filter(([k]) => k));
    return (
      <div className="sh sh-inbox">
        <GoKeys map={map} single={NEW_KEY} />
        <aside className="tj-side sh-desktop no-print">
          <UserMenu label={user.name} triggerClass="tj-ws" trigger={<><Logo size={22} /><RiExpandUpDownLine className="tj-ws-chev" aria-hidden /></>}>
            {account}
          </UserMenu>
          <CommandPalette
            pages={all}
            actions={[
              { href: "/shipments/new", label: labels.newShipment, icon: "newShipment" },
              { href: "/scan", label: labels.scan, icon: "scan" },
            ]}
            labels={extra.palette}
          />
          <Link href="/shipments/new" className="tj-new"><RiAddLine aria-hidden /><span>{labels.newShipment}</span><kbd>N</kbd></Link>
          <div className="tj-nav" data-keys>
            <NavLinks items={main} all={all} icons={icons} />
            <p className="tj-sec">{labels.settings}</p>
            <NavLinks items={admin} all={all} icons={icons} />
          </div>
          <div className="tj-foot">
            <span className="sh-avatar">{initials(user.name)}</span>
            <span><b>{user.name}</b><span>{user.role}</span></span>
          </div>
        </aside>
        <div className="min-w-0">
          {mobile}
          <main className="sh-main">{children}</main>
        </div>
      </div>
    );
  }

  /* Val: Material 3 Expressive navigation rail with a FAB; opens into the expanded rail */
  if (shell === "navrail") {
    return (
      <div className="sh sh-navrail" data-open="false">
        <aside className="vr-rail sh-desktop no-print">
          <RailToggle label={labels.menu} />
          <Link href="/shipments/new" className="vr-fab" aria-label={labels.newShipment}><Plus aria-hidden /><span>{labels.newShipment}</span></Link>
          <NavLinks items={main} all={all} icons={icons} short />
          <div className="vr-admin"><NavLinks items={admin} all={all} icons={icons} /></div>
        </aside>
        <div className="min-w-0">
          {mobile}
          <header className="vr-top sh-desktop no-print">
            <div className="vr-search">{search}</div>
            <Link href="/scan" className="vr-icon" aria-label={labels.scan} title={labels.scan}><ScanLine aria-hidden /></Link>
            {menu()}
          </header>
          <main className="sh-main">{children}</main>
        </div>
      </div>
    );
  }

  if (shell === "sidebar") {
    return (
      <div className="sh sh-sidebar">
        <aside className="sh-side sh-desktop no-print">
          <Link href="/"><Logo /></Link>
          <NavLinks items={all} gaps />
          <div className="sh-side-foot">
            <UserMenu label={user.name} side="up" triggerClass="sh-who" trigger={<><span className="sh-avatar">{initials(user.name)}</span><span><b>{user.name}</b><span>{user.role}</span></span></>}>
              {account}
            </UserMenu>
          </div>
        </aside>
        <div className="min-w-0">
          {mobile}
          <header className="sh-head sh-desktop no-print">{search}<div className="sh-right"><div className="sh-actions">{scan}{add}</div></div></header>
          <main className="sh-main">{children}</main>
        </div>
      </div>
    );
  }

  if (shell === "capsule") {
    return (
      <div className="sh sh-capsule">
        {mobile}
        <header className="sh-cap sh-desktop no-print">
          <Link href="/"><Logo /></Link>
          <NavLinks items={main} all={all} />
          {settingsMenu}
          <span className="sh-sep" aria-hidden />
          {search}
          {add}
          {menu()}
        </header>
        <main className="sh-main">{children}</main>
      </div>
    );
  }

  if (shell === "rail") {
    return (
      <div className="sh sh-rail">
        <aside className="sh-railbar sh-desktop no-print">
          <Link href="/"><Logo size={40} /></Link>
          <LinkButton href="/shipments/new" aria-label={labels.newShipment} title={labels.newShipment} className="sh-fab"><Plus aria-hidden /></LinkButton>
          <NavLinks items={main} all={all} short />
          <div className="sh-rail-end">
            {settingsMenu}
            {menu("up")}
          </div>
        </aside>
        <div className="min-w-0">
          {mobile}
          <header className="sh-railhead sh-desktop no-print">{search}<div className="sh-right"><div className="sh-actions">{scan}</div></div></header>
          <main className="sh-main">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="sh sh-topbar">
      {mobile}
      <header className="sh-bar sh-desktop no-print">
        <Link href="/" className="flex items-center"><Logo /></Link>
        <NavLinks items={main} all={all} />
        <div className="sh-more">{settingsMenu}</div>
        <div className="sh-right">
          {search}
          <div className="sh-actions">{scan}{add}{menu()}</div>
        </div>
      </header>
      <main className="sh-main">{children}</main>
    </div>
  );
}
