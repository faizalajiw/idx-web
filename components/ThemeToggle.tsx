"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const KEY = "ml-theme";

function currentTheme(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

/** Toggle tema gelap/terang. Sekelas dengan script inline di layout. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  // Sinkronkan ikon dengan kelas yang sudah dipasang script inline (hindari mismatch SSR).
  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  }

  const label = theme === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap";

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost"
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
