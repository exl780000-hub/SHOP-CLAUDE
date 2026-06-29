import { createContext, useContext, useState } from "react";

export const ACCENT_THEMES = [
  { key: "gold",   name: "金色",   accent: "#C9A84C" },
  { key: "rose",   name: "玫瑰",   accent: "#D4847A" },
  { key: "sage",   name: "翠綠",   accent: "#5E9E6E" },
  { key: "blue",   name: "靛藍",   accent: "#4A7AB5" },
  { key: "purple", name: "薰衣草", accent: "#8A6ABF" },
  { key: "coral",  name: "珊瑚",   accent: "#E07A5F" },
];

const BASE = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  ivory: "#F0EBE0", sage: "#7A9E8A",
  red: "#E05252", green: "#5E9E6E", mid: "#2A3A50",
  blue: "#4A7AB5", purple: "#8A6ABF",
};

const ThemeCtx = createContext({
  C: { ...BASE, gold: "#C9A84C" },
  themeKey: "gold",
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(
    () => localStorage.getItem("gony-theme") || "gold"
  );
  const accent = ACCENT_THEMES.find(t => t.key === themeKey)?.accent || "#C9A84C";
  const C = { ...BASE, gold: accent };

  const setTheme = (key) => {
    setThemeKeyState(key);
    localStorage.setItem("gony-theme", key);
  };

  return (
    <ThemeCtx.Provider value={{ C, themeKey, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx).C;
}

export function useThemeControl() {
  const { themeKey, setTheme } = useContext(ThemeCtx);
  return { themeKey, setTheme };
}
