"use client";

import { useEffect } from "react";

// Applies the last-saved theme before first paint on routes that don't
// mount the main <App> (which owns the toggle + live sync). Standalone
// pages like not-found/error only need to respect the saved preference.
export function ThemeSync() {
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return null;
}
