import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import OrderEntry from "./pages/OrderEntry.jsx";
import Orders from "./pages/Orders.jsx";
import Dispatch from "./pages/Dispatch.jsx";
import DispatchTracking from "./pages/DispatchTracking.jsx";
import QuickExpense from "./pages/QuickExpense.jsx";
import Wages from "./pages/Wages.jsx";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
};

const PAGES = [
  { to: "/order",    label: "建立訂單", icon: "📋", color: "#C9A84C" },
  { to: "/orders",   label: "訂單查詢", icon: "🔍", color: "#4A7AB5" },
  { to: "/dispatch", label: "派工管理", icon: "✂️", color: "#7A9E8A" },
  { to: "/tracking", label: "派工追蹤", icon: "📊", color: "#B87AB5" },
  { to: "/expense",  label: "快速記帳", icon: "💰", color: "#E07A5F" },
  { to: "/wages",    label: "工資計算", icon: "🧾", color: "#5E9E6E" },
];

const SIDEBAR_W = 64;   // 收起寬度（只顯示 icon）
const SIDEBAR_EXP = 180; // 展開寬度

function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (to) => {
    navigate(to);
    onClose();
  };

  return (
    <>
      {/* 遮罩 */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 40,
          }}
        />
      )}

      {/* 側邊欄 */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: open ? SIDEBAR_EXP : SIDEBAR_W,
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        zIndex: 50,
        transition: "width 0.22s ease",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo 區 */}
        <div style={{
          height: 56, display: "flex", alignItems: "center",
          padding: open ? "0 18px" : "0",
          justifyContent: open ? "flex-start" : "center",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, color: C.gold, fontFamily: "Georgia,serif", flexShrink: 0 }}>✦</div>
          {open && (
            <div style={{ marginLeft: 10, overflow: "hidden" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif", whiteSpace: "nowrap" }}>GONY</div>
              <div style={{ fontSize: 10, color: C.sage, whiteSpace: "nowrap" }}>西裝店管理系統</div>
            </div>
          )}
        </div>

        {/* 導航項目 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {PAGES.map(p => {
            const active = location.pathname === p.to || location.pathname.startsWith(p.to + "/");
            return (
              <button
                key={p.to}
                onClick={() => go(p.to)}
                title={p.label}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: 12, padding: open ? "13px 18px" : "13px 0",
                  justifyContent: open ? "flex-start" : "center",
                  background: active ? p.color + "22" : "transparent",
                  borderLeft: active ? `3px solid ${p.color}` : "3px solid transparent",
                  border: "none", borderLeft: active ? `3px solid ${p.color}` : "3px solid transparent",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{p.icon}</span>
                {open && (
                  <span style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? p.color : C.sage,
                    whiteSpace: "nowrap", overflow: "hidden",
                  }}>{p.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function TopBar({ onMenuToggle }) {
  const location = useLocation();
  const current = PAGES.find(p => location.pathname === p.to || location.pathname.startsWith(p.to + "/"));

  return (
    <div style={{
      position: "fixed", top: 0, left: SIDEBAR_W, right: 0, height: 56,
      background: C.card, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
      zIndex: 30,
    }}>
      {/* 漢堡選單按鈕 */}
      <button onClick={onMenuToggle} style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: C.sage, fontSize: 20, padding: "4px 6px", lineHeight: 1,
        borderRadius: 6,
      }}>☰</button>

      {current && (
        <>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{current.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: current.color }}>{current.label}</span>
        </>
      )}
      {!current && (
        <span style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>GONY 西裝店</span>
      )}
    </div>
  );
}

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ivory }}>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <TopBar onMenuToggle={() => setOpen(o => !o)} />
      {/* 內容區：左側留出收起側邊欄的寬度，頂部留 TopBar 高度 */}
      <div style={{ marginLeft: SIDEBAR_W, paddingTop: 56 }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
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
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
