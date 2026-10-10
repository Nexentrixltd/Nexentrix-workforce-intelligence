import { useUserStore } from "@/store/userStore";
import { Bell, Search } from "lucide-react";
import React from "react";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const user = useUserStore((state) => state.user);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=random`;
  return (
    <header className="h-16 px-6 ml-72 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
      <div />

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 bg-surface/50 border border-transparent focus-within:border-primary/30 rounded-lg px-3 py-2 w-64 transition">
          <Search className="w-4 h-4 text-slate-400" />

          <input
            type="text"
            placeholder="Search"
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
          />
        </div>

        <button className="relative cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <Bell className="w-5 h-5 text-primary" />

          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        <ThemeToggle />

        <img
          src={avatarUrl}
          alt={user?.name || "User"}
          className="h-10 w-10 rounded object-cover border border-border/50"
        />
      </div>
    </header>
  );
};

export default Header;
