"use client";

import { Archive, PlusCircle, Star } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {motion} from 'motion/react'

export default function Selection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentView = searchParams.get("view") || "all";

  const navItems = [
    { icon: PlusCircle, label: "All Notes", view: "all" },
    { icon: Star, label: "Favorites", view: "favorites" },
    { icon: Archive, label: "Archive", view: "archive" },
    
  ];

  const handleNavClick = (view: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (view === "all") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div>
      <nav
        className="p-1 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-white/40 dark:border-gray-700 flex gap-2 overflow-x-auto overflow-y-hidden"
        aria-label="Notes filters"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <motion.button
            whileHover={{scale:1.03}}
            whileTap={{scale:0.95}}
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className={[
                "shrink-0 inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
            >
              <Icon size={16} />
              <span className="whitespace-nowrap">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
