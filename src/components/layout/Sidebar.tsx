"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { BookOpenCheck, Brain, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import Image from "next/image";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <aside
      className={[
        "hidden md:flex h-screen shrink-0 flex-col border-r border-black/10 dark:border-white/10",
        "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl",
        "transition-[width] duration-300 ease-out",
        isCollapsed ? "w-20" : "w-72",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <Image src="/images/logo.png" width={36} height={36} alt="WZDM" className="rounded-md" />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">WZDM</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Study Workspace</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      <nav className="p-3 space-y-1">
        {[
          { label: "Dashboard", icon: LayoutDashboard },
          { label: "Revision", icon: Brain },
          { label: "Notebook", icon: BookOpenCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-secondary/20 dark:hover:bg-white/10"
            >
              <Icon size={16} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-3 border-t border-black/10 dark:border-white/10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {session.user?.image ? (
              <img src={session.user.image} alt={session.user?.name || "User"} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-secondary/40 inline-flex items-center justify-center">
                <User size={16} />
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{session.user?.name || "Student"}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{session.user?.email}</p>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => signOut()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm bg-primary text-white hover:opacity-90"
          >
            <LogOut size={14} />
            {!isCollapsed && "Sign out"}
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
