"use client";

import { Archive, Clock3, NotebookTabs, Star } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function Selection({ onViewChange }: { onViewChange?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentView = searchParams.get("view") || "all";

  const navItems = [
    { icon: NotebookTabs, label: "All Notes", view: "all" },
    { icon: Clock3, label: "Recent", view: "recent" },
    { icon: Star, label: "Favorites", view: "favorites" },
    { icon: Archive, label: "Archived", view: "archive" },
  ];

  const handleNavClick = (view: string) => {
    if (view === currentView) return;
    onViewChange?.();
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("view", view);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <nav className="app-notes-tabs" aria-label="Note views">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => handleNavClick(item.view)}
            className={`app-notes-tab${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
