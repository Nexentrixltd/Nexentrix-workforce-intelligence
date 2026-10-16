"use client";

import { useState } from "react";
import { Bell, Search, X } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const user = useUserStore((state) => state.user);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-sidebar sm:px-6 md:relative md:ml-72">
      {searchOpen ? (
        <div className="flex w-full items-center gap-2 sm:hidden">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-transparent bg-surface/50 px-3 py-2 transition focus-within:border-primary/30">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              autoFocus
              aria-label="Search"
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="cursor-pointer rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
      ) : null}

      <div className={searchOpen ? "hidden sm:block" : "block"} />

      <div
        className={`items-center gap-2 sm:gap-4 lg:gap-5 ${
          searchOpen ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="hidden w-44 items-center gap-2 rounded-lg border border-transparent bg-surface/50 px-3 py-2 transition focus-within:border-primary/30 sm:flex lg:w-64">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            aria-label="Search"
            placeholder="Search"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Open search"
          className="cursor-pointer rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 sm:hidden"
        >
          <Search className="h-5 w-5 text-primary" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative cursor-pointer rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5 text-primary" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <ThemeToggle />

        <img
          src={user?.image || ""}
          alt={user?.name || "User"}
          className="h-9 w-9 shrink-0 hidden md:flex rounded border border-border/50 object-cover sm:h-10 sm:w-10"
        />
      </div>
    </header>
  );
};

export default Header;