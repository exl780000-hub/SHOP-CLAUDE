import { createContext, useContext, useState } from "react";

export const ACCENT_THEMES = [
  { key: "gold",   name: "金色",   accent: "#C9A84C" },
  { key: "rose",   name: "玫瑰",   accent: "#D4847A" },
  { key: "sage",   name: "翠綠",   accent: "#5E9E6E" },
  { key: "blue",   name: "靛藍",   accent: "#4A7AB5" },
  { key: "purple", name: "薰衣草", accent: "#8A6ABF" },
  { key: "coral",  name: "珊瑚",   accent: "#E07A5F" },
];

// 背景主題（日系傳統色）
export const BG_THEMES = [
  {
    key: "dark-blue",
    name: "深藍",
    preview: "#0F1923",
    bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
    ivory: "#F0EBE0", sage: "#7A9E8A", mid: "#2A3A50",
    dark: true,
  },
  {
    key: "kobita",
    name: "媚茶",
    preview: "#716246",
    bg: "#231A10", card: "#332A1E", border: "#4A3A2A",
    ivory: "#F5EDD8", sage: "#A89068", mid: "#332A1E",
    dark: true,
  },
  {
    key: "fukagawa",
    name: "深川鼠",
    preview: "#97a791",
    bg: "#1E2B1E", card: "#2B3B2A", border: "#3B4E3A",
    ivory: "#ECF0E8", sage: "#8AAE88", mid: "#2B3B2A",
    dark: true,
  },
  {
    key: "kaihaku",
    name: "灰白",
    preview: "#e9e4d4",
    bg: "#E9E4D4", card: "#F5F0E5", border: "#C5BDA8",
    ivory: "#2A2018", sage: "#6A5848", mid: "#DDD8C5",
    dark: false,
  },
  {
    key: "orchid",
    name: "蘭灰",
    preview: "#bcc7d7",
    bg: "#C8D3E3", card: "#D8E3F0", border: "#A8B5C8",
    ivory: "#1A2535", sage: "#445568", mid: "#B5C0D0",
    dark: false,
  },
];

const FIXED = { red: "#E05252", green: "#5E9E6E", blue: "#4A7AB5", purple: "#8A6ABF" };

const ThemeCtx = createContext({
  C: { ...BG_THEMES[0], gold: "#C9A84C", ...FIXED },
  accentKey: "gold",
  bgKey: "dark-blue",
  setAccent: () => {},
  setBg: () => {},
});

export function ThemeProvider({ children }) {
  const [accentKey, setAccentKeyState] = useState(
    () => localStorage.getItem("gony-accent") || "gold"
  );
  const [bgKey, setBgKeyState] = useState(
    () => localStorage.getItem("gony-bg") || "dark-blue"
  );

  const accentColor = ACCENT_THEMES.find(t => t.key === accentKey)?.accent || "#C9A84C";
  const bgTheme = BG_THEMES.find(t => t.key === bgKey) || BG_THEMES[0];

  const C = {
    bg: bgTheme.bg, card: bgTheme.card, border: bgTheme.border,
    ivory: bgTheme.ivory, sage: bgTheme.sage, mid: bgTheme.mid,
    gold: accentColor,
    ...FIXED,
    // 卡片陰影：深色主題用深陰影營造層次，淺色主題用淡陰影避免髒
    shadowCard: bgTheme.dark ? "0 2px 12px rgba(0,0,0,0.28)" : "0 2px 12px rgba(20,20,20,0.08)",
    shadowPop:  bgTheme.dark ? "0 10px 32px rgba(0,0,0,0.5)"  : "0 10px 32px rgba(20,20,20,0.16)",
  };

  const setAccent = (key) => { setAccentKeyState(key); localStorage.setItem("gony-accent", key); };
  const setBg     = (key) => { setBgKeyState(key);     localStorage.setItem("gony-bg", key); };

  return (
    <ThemeCtx.Provider value={{ C, accentKey, bgKey, setAccent, setBg }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx).C;
}

export function useThemeControl() {
  const { accentKey, bgKey, setAccent, setBg } = useContext(ThemeCtx);
  return { accentKey, bgKey, setAccent, setBg };
}
