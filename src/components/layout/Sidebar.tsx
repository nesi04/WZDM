"use client";

import { Archive, MessageSquare, PlusCircle, Search, Star, Tag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentView = searchParams.get('view') || 'all';

  const navItems = [
    { icon: PlusCircle, label: "All Notes", view: "all" },
    { icon: Star, label: "Favorites", view: "favorites" },
    { icon: Archive, label: "Archive", view: "archive" },
    { icon: Tag, label: "Tags", view: "tags" },
  ];

  const handleNavClick = (view: string) => {
    if (view === 'all') {
      router.push('/');
    } else {
      router.push(`/?view=${view}`);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2
            className={`font-bold text-xl text-gray-900 dark:text-white transition-opacity ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
          >
            WZDM
          </h2>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              isCollapsed={isCollapsed}
              isActive={currentView === item.view}
              onClick={() => handleNavClick(item.view)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              v1.0.0 • Day 3
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  isCollapsed,
  isActive,
  onClick,
}: {
  icon: any;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
      }`}
      title={isCollapsed ? label : undefined}
    >
      <Icon
        size={20}
        className={
          isActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300"
        }
      />
      {!isCollapsed && (
        <span className="font-medium transition-opacity">{label}</span>
      )}
      {isActive && !isCollapsed && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
      )}
    </button>
  );
}
