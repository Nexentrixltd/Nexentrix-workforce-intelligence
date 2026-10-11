"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const currentTheme = resolvedTheme;

  const handleToggle = () => {
    if (theme === "light") return setTheme("dark");
    if (theme === "dark") return setTheme("system");
    return setTheme("light");
  };

  const getTitle = () => {
    if (theme === "light") return "Switch to dark mode";
    if (theme === "dark") return "Switch to system mode";
    return "Switch to light mode";
  };

  return (
    <button
      onClick={handleToggle}
      title={getTitle()}
      className="relative hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition hover:bg-muted"
    >
      <Sun
        className={`h-4 w-4 transition-all text-accent ${
          currentTheme === "light"
            ? "rotate-0 scale-100"
            : "-rotate-90 scale-0"
        }`}
      />

      <Moon
        className={`absolute h-4 w-4 transition-all text-white ${
          currentTheme === "dark"
            ? "rotate-0 scale-100"
            : "rotate-90 scale-0"
        }`}
      />

      <Laptop
        className={`absolute h-4 w-4 transition-all text-white ${
          theme === "system"
            ? "rotate-0 scale-100"
            : "rotate-90 scale-0"
        }`}
      />
    </button>
  );
}