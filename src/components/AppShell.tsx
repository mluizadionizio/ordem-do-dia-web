"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  {
    label: "Ordem do Dia",
    href: "/",
    matchPrefix: ["/", "/nova", "/sessao"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: "Gabinete Virtual",
    href: "/gabinete",
    matchPrefix: ["/gabinete"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

function isActive(href: string, matchPrefixes: string[], pathname: string): boolean {
  if (href === "/" && matchPrefixes.includes("/")) {
    // Home is active only when not in gabinete
    return !pathname.startsWith("/gabinete");
  }
  return matchPrefixes.some((p) => p !== "/" && pathname.startsWith(p));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Persist sidebar collapse state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", String(!c));
      return !c;
    });
  };

  const handleSignOut = () => signOut(auth);

  const activeLabel = NAV_ITEMS.find((item) =>
    isActive(item.href, item.matchPrefix, pathname)
  )?.label ?? "Sistema Gabinete";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-red-900 text-white transition-all duration-200
          ${collapsed ? "w-16" : "w-60"}`}
      >
        {/* Logo block */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-red-800 ${collapsed ? "justify-center px-0" : ""}`}>
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow">
            <span className="text-red-900 text-sm font-black tracking-tight">LC</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate">Sistema Gabinete</p>
              <p className="text-xs text-red-200 leading-tight truncate">Liana Cirne</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.matchPrefix, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${active
                    ? "bg-white/15 text-white"
                    : "text-red-200 hover:bg-white/10 hover:text-white"}
                  ${collapsed ? "justify-center" : ""}`}
              >
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user + sign out */}
        <div className={`border-t border-red-800 p-3 flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user?.displayName ?? user?.email ?? "Usuário"}
              </p>
              <p className="text-xs text-red-300 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            title="Sair"
            className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-red-300 hover:text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="border-t border-red-800 py-2 flex items-center justify-center text-red-300 hover:text-white hover:bg-white/10 transition text-xs gap-1"
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>Recolher</span>
            </>
          )}
        </button>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between bg-red-900 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-red-900 text-xs font-black">LC</span>
            </div>
            <span className="font-semibold text-sm">{activeLabel}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-white/10 text-red-200 hover:text-white transition"
            title="Sair"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* ── Bottom tab bar (mobile) ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.matchPrefix, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition
                  ${active ? "text-red-900" : "text-gray-400 hover:text-gray-600"}`}
              >
                <span className={`transition ${active ? "text-red-900" : "text-gray-400"}`}>
                  {item.icon}
                </span>
                <span className="leading-none">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
