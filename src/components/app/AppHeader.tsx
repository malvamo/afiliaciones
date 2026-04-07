"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/especialistas", label: "Especialistas" },
  { href: "/sedes", label: "Sedes" },
  { href: "/seguros", label: "Seguros" },
  { href: "/pendientes", label: "Pendientes" },
  { href: "/alertas", label: "Alertas" },
  { href: "/recordatorios", label: "Recordatorios" },
  { href: "/renovaciones", label: "Renovaciones" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="app-header">
      <div className="app-container">
        <div className="flex items-center gap-3">
          <Link href="/" className="app-brand" aria-label="Ir al dashboard">
            <span className="app-mark" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M8.2 3.8c1.3-1.1 2.7-.8 3.8.2 1-1 2.5-1.4 3.8-.2 1.8 1.5 2.6 4.7 2 8.3-.6 3.4-2.4 8.1-5.8 8.1s-3.7-4.7-3.8-7.1c-.1 2.4-.5 7.1-3.8 7.1S5 15.5 4.4 12.1c-.6-3.6.2-6.8 3.8-8.3z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            </span>
            <span className="leading-none">
              <span className="app-brand-title">Afiliaciones</span>
              <span className="app-brand-sub">matriz por sede y seguro</span>
            </span>
          </Link>
        </div>

        <nav className="app-nav" aria-label="Navegacion">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                className="app-navlink"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
