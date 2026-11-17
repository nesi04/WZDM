"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  BookOpenText,
  Brain,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  House,
  LibraryBig,
  LogOut,
  Menu,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
};

const primaryItems: NavigationItem[] = [
  { label: "Home", icon: House, href: "/" },
  { label: "Notes", icon: BookOpenText, href: "/?view=all" },
  { label: "Flashcards", icon: Brain, href: "/flashcards" },
  { label: "Quizzes", icon: CircleHelp, disabled: true },
  { label: "Progress", icon: ChartNoAxesColumnIncreasing, disabled: true },
];

const secondaryItems: NavigationItem[] = [
  { label: "Subjects", icon: LibraryBig, disabled: true },
  { label: "Settings", icon: Settings, disabled: true },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");
  const isNoteWorkspace = pathname.startsWith("/notes/");
  const isFlashcardsView = pathname === "/flashcards";
  const homeActive = pathname === "/" && currentView === null;
  const notesActive = isNoteWorkspace || (pathname === "/" && currentView !== null);
  const currentContext = isNoteWorkspace
    ? "Learning Workspace"
    : isFlashcardsView
      ? "Flashcards"
    : notesActive
    ? currentView === "favorites"
      ? "Favorites"
      : currentView === "archive"
        ? "Archive"
        : currentView === "tags"
          ? "Tagged Notes"
          : "Notes"
    : "Home";

  if (!session) return null;

  const renderItems = (items: NavigationItem[], compact: boolean) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = item.label === "Home"
        ? homeActive
        : item.label === "Notes"
          ? notesActive
          : item.label === "Flashcards" && isFlashcardsView;
      const className = [
        "flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors",
        compact ? "justify-center px-2" : "",
        active
          ? "border-l-blue-700 bg-blue-50 font-semibold text-blue-800 dark:border-l-blue-400 dark:bg-blue-950/50 dark:text-blue-200"
          : "border-l-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
        item.disabled
          ? "cursor-not-allowed text-gray-400 hover:bg-transparent dark:text-gray-600 dark:hover:bg-transparent"
          : "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400",
      ].join(" ");

      if (item.disabled) {
        return (
          <button
            key={item.label}
            type="button"
            disabled
            title={`${item.label} is coming soon`}
            className={className}
          >
            <Icon size={18} aria-hidden="true" />
            {!compact && <span className="flex-1 text-left">{item.label}</span>}
            {!compact && <span className="text-[11px] text-gray-400 dark:text-gray-500">Soon</span>}
          </button>
        );
      }

      return (
        <Link
          key={item.label}
          href={item.href!}
          onClick={() => setMobileOpen(false)}
          aria-current={active ? "page" : undefined}
          title={compact ? item.label : undefined}
          className={className}
        >
          <Icon size={18} aria-hidden="true" />
          {!compact && <span>{item.label}</span>}
        </Link>
      );
    });

  const renderAccount = (compact: boolean) => (
    <div className="space-y-3">
      {!compact && (
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Account
        </p>
      )}
      <div className="flex items-center gap-3 px-2">
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <UserRound size={17} aria-hidden="true" />
          </span>
        )}
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {session.user?.name || "Student"}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {session.user?.email}
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        disabled
        title="Profile is coming soon"
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 dark:text-gray-600"
      >
        <UserRound size={18} aria-hidden="true" />
        {!compact && <span>Profile</span>}
      </button>
      <div className={`flex items-center ${compact ? "justify-center" : "justify-between px-2"}`}>
        {!compact && <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>}
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        title={compact ? "Sign out" : undefined}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400 ${compact ? "justify-center px-2" : ""}`}
      >
        <LogOut size={18} aria-hidden="true" />
        {!compact && <span>Sign out</span>}
      </button>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden h-dvh shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex ${isCollapsed ? "w-[4.5rem]" : "w-64"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/images/logo.png" width={32} height={32} alt="WZDM" className="shrink-0 rounded" />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-950 dark:text-white">WZDM</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Learning workspace</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-6 overflow-y-auto p-3">
          <section>
            {!isCollapsed && (
              <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Primary
              </h2>
            )}
            <div className="space-y-1">{renderItems(primaryItems, isCollapsed)}</div>
          </section>
          <section>
            {!isCollapsed && (
              <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Secondary
              </h2>
            )}
            <div className="space-y-1">{renderItems(secondaryItems, isCollapsed)}</div>
          </section>
        </nav>

        <div className="space-y-4 border-t border-gray-200 p-3 dark:border-gray-800">
          {renderAccount(isCollapsed)}
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/images/logo.png" width={28} height={28} alt="WZDM" className="shrink-0 rounded" />
          <span className="text-sm font-semibold text-gray-950 dark:text-white">WZDM</span>
          <span className="truncate border-l border-gray-300 pl-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            {currentContext}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
        >
          <Menu size={19} aria-hidden="true" />
        </button>
      </header>

      <Dialog
        open={mobileOpen}
        onClose={setMobileOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setMobileOpen(false);
          }
        }}
        className="relative z-[60] md:hidden"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex">
          <DialogPanel
            id="mobile-navigation"
            className="flex h-dvh w-80 max-w-[calc(100vw-2rem)] flex-col border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Image src="/images/logo.png" width={32} height={32} alt="WZDM" className="rounded" />
                <div>
                  <DialogTitle className="text-sm font-semibold text-gray-950 dark:text-white">
                    WZDM navigation
                  </DialogTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentContext}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Primary navigation" className="flex-1 space-y-6 overflow-y-auto p-3">
              <section>
                <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Primary
                </h2>
                <div className="space-y-1">{renderItems(primaryItems, false)}</div>
              </section>
              <section>
                <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Secondary
                </h2>
                <div className="space-y-1">{renderItems(secondaryItems, false)}</div>
              </section>
            </nav>
            <div className="space-y-4 border-t border-gray-200 p-3 dark:border-gray-800">
              {renderAccount(false)}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
