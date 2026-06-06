import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  Moon,
  Redo2,
  Scissors,
  Search,
  Settings,
  Sun,
  Undo2,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { useShallow } from "zustand/shallow";
import { GlobalSearch } from "./GlobalSearch";
import { useAppStore } from "../store/useAppStore";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Today", path: "/", icon: <CalendarCheck size={20} /> },
  {
    label: "Calendar",
    path: "/calendar",
    icon: <CalendarDays size={20} />,
    matchPrefix: "/calendar",
  },
  { label: "Clients", path: "/clients", icon: <Users size={20} /> },
  { label: "Services", path: "/services", icon: <Scissors size={20} /> },
  { label: "Settings", path: "/settings", icon: <Settings size={20} /> },
];

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);

  const { undo, redo, canUndo, canRedo, setCurrentRoute, pendingNavRoute, clearPendingNavRoute } = useAppStore(
    useShallow((s) => ({
      undo: s.undo,
      redo: s.redo,
      canUndo: s.appointmentHistory.length > 0,
      canRedo: s.appointmentFuture.length > 0,
      setCurrentRoute: s.setCurrentRoute,
      pendingNavRoute: s.pendingNavRoute,
      clearPendingNavRoute: s.clearPendingNavRoute,
    })),
  );

  // Track current route in store so history entries know where to navigate back to
  useEffect(() => {
    setCurrentRoute(pathname);
  }, [pathname, setCurrentRoute]);

  // Navigate when undo/redo sets a pending route
  useEffect(() => {
    if (!pendingNavRoute) return;
    clearPendingNavRoute();
    navigate({ to: pendingNavRoute as "/" });
  }, [pendingNavRoute, navigate, clearPendingNavRoute]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  function isActive(item: NavItem): boolean {
    if (item.matchPrefix) {
      return pathname.startsWith(item.matchPrefix);
    }
    return pathname === item.path;
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <div
      className="flex flex-col h-screen bg-background text-foreground"
      data-ocid="app.root"
    >
      {/* Global search overlay */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scissors size={22} className="text-accent" />
          <span className="text-lg font-semibold tracking-tight font-display">
            StyleBook
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            aria-label="Search"
            className="p-2 rounded-full hover:bg-muted transition-colors"
            data-ocid="header.search_button"
          >
            <Search size={18} className="text-foreground" />
          </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="p-2 rounded-full hover:bg-muted transition-colors"
          data-ocid="header.theme_toggle"
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-accent" />
          ) : (
            <Moon size={18} className="text-foreground" />
          )}
        </button>
        </div>
      </header>

      {/* Body — sidebar on desktop, full-width on mobile */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border flex-shrink-0 py-4">
          <nav className="flex flex-col gap-1 px-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                  data-ocid={`nav.${item.label.toLowerCase()}_link`}
                >
                  <span
                    className={active ? "text-accent" : "text-muted-foreground"}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Branding footer */}
          <div className="mt-auto px-4 pb-2">
            <p className="text-[10px] text-muted-foreground text-center leading-4">
              &copy; {new Date().getFullYear()} &bull;{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main
          className="flex-1 overflow-auto bg-background"
          data-ocid="app.main_content"
        >
          {children}
        </main>
      </div>

      {/* Floating undo/redo pill — mobile, above bottom nav */}
      {(canUndo || canRedo) && (
        <div className="md:hidden fixed bottom-20 left-3 z-50 flex gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-card border border-border shadow transition-opacity"
            style={{ opacity: canUndo ? 1 : 0.4 }}
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-card border border-border shadow transition-opacity"
            style={{ opacity: canRedo ? 1 : 0.4 }}
          >
            <Redo2 size={18} />
          </button>
        </div>
      )}

      {/* Mobile bottom tab bar — safe-area-inset-bottom keeps it above iPhone home bar */}
      <nav
        className="md:hidden flex items-center bg-card border-t border-border flex-shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        data-ocid="nav.bottom_tabs"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-h-[56px]",
                active
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              data-ocid={`nav.${item.label.toLowerCase()}_tab`}
            >
              <span className={active ? "text-accent" : ""}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
