import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import OrderEntry from "./pages/OrderEntry.jsx";
import Orders from "./pages/Orders.jsx";
import Dispatch from "./pages/Dispatch.jsx";
import DispatchTracking from "./pages/DispatchTracking.jsx";
import QuickExpense from "./pages/QuickExpense.jsx";
import Wages from "./pages/Wages.jsx";
import { ThemeProvider, useTheme, useThemeControl, ACCENT_THEMES } from "./theme.jsx";

const PAGES = [
  { to: "/order",    label: "建立訂單", icon: "📋" },
  { to: "/orders",   label: "訂單查詢", icon: "🔍" },
  { to: "/dispatch", label: "派工管理", icon: "✂️" },
  { to: "/tracking", label: "派工追蹤", icon: "📊" },
  { to: "/expense",  label: "快速記帳", icon: "💰" },
  { to: "/wages",    label: "工資計算", icon: "🧾" },
];

const SIDEBAR_W   = 64;
const SIDEBAR_EXP = 200;

function ThemePicker() {
  const C = useTheme();
  const { themeKey, setTheme } = useThemeControl();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="變更主題顏色"
        style={{
          width: "100%", background: "transparent", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8, padding: "8px 0",
        }}
      >
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          background: C.gold, border: `2px solid ${C.gold}88`, display: "block", flexShrink: 0,
        }} />
      </button>
      {open && (
        <div style={{
          padding: "8px 10px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {ACCENT_THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => { setTheme(t.key); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: themeKey === t.key ? t.accent + "22" : "transparent",
                border: `1px solid ${themeKey === t.key ? t.accent + "88" : "transparent"}`,
                borderRadius: 8, padding: "6px 8px", cursor: "pointer", width: "100%",
              }}
            >
              <span style={{
                width: 12, height: 12, borderRadius: "50%",
                background: t.accent, flexShrink: 0, display: "block",
              }} />
              <span style={{ fontSize: 11, color: themeKey === t.key ? t.accent : "#7A9E8A", whiteSpace: "nowrap" }}>
                {t.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const C = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const go = (to) => { navigate(to); onClose(); };

  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40,
        }} />
      )}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: open ? SIDEBAR_EXP : SIDEBAR_W,
        background: C.card, borderRight: `1px solid ${C.border}`,
        zIndex: 50, transition: "width 0.22s ease",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{
          height: 56, display: "flex", alignItems: "center",
          padding: open ? "0 18px" : "0", justifyContent: open ? "flex-start" : "center",
          borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, color: C.gold, fontFamily: "Georgia,serif", flexShrink: 0 }}>✦</div>
          {open && (
            <div style={{ marginLeft: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif", whiteSpace: "nowrap" }}>GONY</div>
              <div style={{ fontSize: 10, color: C.sage, whiteSpace: "nowrap" }}>西裝店管理系統</div>
            </div>
          )}
        </div>

        {/* 導航 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {PAGES.map(p => {
            const active = location.pathname === p.to || location.pathname.startsWith(p.to + "/");
            return (
              <button key={p.to} onClick={() => go(p.to)} title={p.label} style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 12, padding: open ? "13px 18px" : "13px 0",
                justifyContent: open ? "flex-start" : "center",
                background: active ? C.gold + "22" : "transparent",
                border: "none", borderLeft: active ? `3px solid ${C.gold}` : "3px solid transparent",
                cursor: "pointer", transition: "background 0.15s",
              }}>
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{p.icon}</span>
                {open && (
                  <span style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? C.gold : C.sage,
                    whiteSpace: "nowrap", overflow: "hidden",
                  }}>{p.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 主題選色器 */}
        {open && <ThemePicker />}
        {!open && (
          <ThemePickerDot />
        )}
      </div>
    </>
  );
}

function ThemePickerDot() {
  const C = useTheme();
  const { setTheme, themeKey } = useThemeControl();
  const [open, setOpen] = useState(false);
  const current = ACCENT_THEMES.find(t => t.key === themeKey);

  return (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}`, position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="主題顏色"
        style={{
          width: "100%", background: "transparent", border: "none",
          cursor: "pointer", display: "flex", justifyContent: "center",
          alignItems: "center", padding: "8px 0",
        }}
      >
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          background: current?.accent || C.gold,
          border: `2px solid ${(current?.accent || C.gold) + "88"}`,
          display: "block",
        }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: SIDEBAR_W + 4,
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "8px", zIndex: 60,
          display: "flex", flexDirection: "column", gap: 4, minWidth: 100,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {ACCENT_THEMES.map(t => (
            <button key={t.key} onClick={() => { setTheme(t.key); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: themeKey === t.key ? t.accent + "22" : "transparent",
              border: `1px solid ${themeKey === t.key ? t.accent + "66" : "transparent"}`,
              borderRadius: 7, padding: "6px 10px", cursor: "pointer",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.accent, flexShrink: 0, display: "block" }} />
              <span style={{ fontSize: 12, color: themeKey === t.key ? t.accent : C.sage, whiteSpace: "nowrap" }}>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar({ onMenuToggle }) {
  const C = useTheme();
  const location = useLocation();
  const current = PAGES.find(p => location.pathname === p.to || location.pathname.startsWith(p.to + "/"));

  return (
    <div style={{
      position: "fixed", top: 0, left: SIDEBAR_W, right: 0, height: 56,
      background: C.card, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", gap: 12, padding: "0 16px", zIndex: 30,
    }}>
      <button onClick={onMenuToggle} style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: C.sage, fontSize: 20, padding: "4px 6px", lineHeight: 1, borderRadius: 6,
      }}>☰</button>
      {current && (
        <>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{current.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.gold }}>{current.label}</span>
        </>
      )}
      {!current && (
        <span style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>GONY 西裝店</span>
      )}
    </div>
  );
}

function Layout({ children }) {
  const C = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ivory }}>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <TopBar onMenuToggle={() => setOpen(o => !o)} />
      <div style={{ marginLeft: SIDEBAR_W, paddingTop: 56 }}>{children}</div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Orders />} />
            <Route path="/order" element={<OrderEntry />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/tracking" element={<DispatchTracking />} />
            <Route path="/expense" element={<QuickExpense />} />
            <Route path="/wages" element={<Wages />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
