import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  Moon,
  Scissors,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

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
  const { theme, setTheme } = useTheme();

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
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scissors size={22} className="text-accent" />
          <span className="text-lg font-semibold tracking-tight font-display">
            StyleBook
          </span>
        </div>
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

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden flex items-center bg-card border-t border-border flex-shrink-0"
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
