import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import OrderEntry from "./pages/OrderEntry.jsx";
import Orders from "./pages/Orders.jsx";
import Dispatch from "./pages/Dispatch.jsx";
import DispatchTracking from "./pages/DispatchTracking.jsx";
import QuickExpense from "./pages/QuickExpense.jsx";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
};

const TABS = [
  { to: "/order",    label: "新增訂單", icon: "📋" },
  { to: "/orders",   label: "訂單查詢", icon: "🔍" },
  { to: "/dispatch", label: "派工管理", icon: "✂️" },
  { to: "/tracking", label: "派工追蹤", icon: "📊" },
  { to: "/expense",  label: "記帳",    icon: "💰" },
];

function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ivory, paddingBottom: 70 }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "13px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 18, color: C.gold, fontFamily: "Georgia, serif" }}>✦</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>GONY 西裝店管理系統</div>
        </div>
      </div>
      {children}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0" }}>
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} style={({ isActive }) => ({
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            textDecoration: "none", fontSize: 10, fontWeight: 600,
            color: isActive ? C.gold : C.sage,
          })}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/order" replace />} />
          <Route path="/order" element={<OrderEntry />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/tracking" element={<DispatchTracking />} />
          <Route path="/expense" element={<QuickExpense />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
