import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import OrderEntry from "./pages/OrderEntry.jsx";
import Orders from "./pages/Orders.jsx";
import Dispatch from "./pages/Dispatch.jsx";
import DispatchTracking from "./pages/DispatchTracking.jsx";
import QuickExpense from "./pages/QuickExpense.jsx";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
};

const PAGES = [
  { to: "/order",    label: "建立訂單", icon: "📋", desc: "新增客戶、樣式、量身、報價", color: "#C9A84C" },
  { to: "/orders",   label: "訂單查詢", icon: "🔍", desc: "搜尋訂單、更新流程進度",     color: "#4A7AB5" },
  { to: "/dispatch", label: "派工管理", icon: "✂️", desc: "建立打版、製作、修改派工單", color: "#7A9E8A" },
  { to: "/tracking", label: "派工追蹤", icon: "📊", desc: "追蹤師傅進度、確認工資",     color: "#B87AB5" },
  { to: "/expense",  label: "快速記帳", icon: "💰", desc: "記錄收支、產生固定成本",     color: "#E07A5F" },
];

function Home() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✦</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif", letterSpacing: "0.05em" }}>GONY</div>
        <div style={{ fontSize: 13, color: C.sage, marginTop: 4 }}>西裝店管理系統</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PAGES.map(p => (
          <button key={p.to} onClick={() => navigate(p.to)} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: C.card, border: `1px solid ${p.color}44`,
            borderRadius: 14, padding: "18px 20px", cursor: "pointer",
            textAlign: "left", width: "100%",
          }}>
            <div style={{
              fontSize: 28, width: 52, height: 52, borderRadius: 12,
              background: p.color + "22", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}>{p.icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: C.sage, lineHeight: 1.4 }}>{p.desc}</div>
            </div>
            <div style={{ marginLeft: "auto", color: C.border, fontSize: 18, flexShrink: 0 }}>›</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const current = PAGES.find(p => location.pathname.startsWith(p.to));

  return (
    <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      {!isHome && (
        <button onClick={() => navigate("/")} style={{
          cursor: "pointer", background: "transparent", border: "none",
          color: C.sage, fontSize: 20, padding: "0 8px 0 0", lineHeight: 1,
        }}>‹</button>
      )}
      <div style={{ fontSize: 16, color: C.gold, fontFamily: "Georgia,serif" }}>✦</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>
        {current ? current.label : "GONY 西裝店"}
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.ivory }}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/order" element={<OrderEntry />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/tracking" element={<DispatchTracking />} />
          <Route path="/expense" element={<QuickExpense />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
