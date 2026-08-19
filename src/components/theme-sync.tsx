"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return null;
}
