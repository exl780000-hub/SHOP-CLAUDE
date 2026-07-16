import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import OrderEntry from "./pages/OrderEntry.jsx";
import Orders from "./pages/Orders.jsx";
import DispatchTracking from "./pages/DispatchTracking.jsx";
import QuickExpense from "./pages/QuickExpense.jsx";
import Wages from "./pages/Wages.jsx";
import WageCalc from "./pages/WageCalc.jsx";
import { ThemeProvider, useTheme, useThemeControl, ACCENT_THEMES, BG_THEMES } from "./theme.jsx";

const PAGES = [
  { to: "/order",    label: "建立訂單", icon: "📋" },
  { to: "/orders",   label: "訂單查詢", icon: "🔍" },
  { to: "/tracking", label: "派工中心", icon: "✂️" },
  { to: "/expense",  label: "快速記帳", icon: "💰" },
  { to: "/wages",    label: "工資計算", icon: "🧾" },
  { to: "/wage-calc", label: "工資試算", icon: "🧮" },
];

const SIDEBAR_W   = 64;
const SIDEBAR_EXP = 200;

// ── 登入管理 ────────────────────────────────────────────────────────
// 所有 /api/ 請求自動帶上權杖；收到 401 時清除權杖並跳回登入頁
const TOKEN_KEY = "gony_token";
const _origFetch = window.fetch.bind(window);
window.fetch = async (url, opts = {}) => {
  const isApi = typeof url === "string" && url.startsWith("/api/");
  if (isApi) {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) opts = { ...opts, headers: { ...(opts.headers || {}), "X-Auth-Token": t } };
  }
  const r = await _origFetch(url, opts);
  if (isApi && r.status === 401) {
    const d = await r.clone().json().catch(() => ({}));
    if (d.authRequired) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("gony-auth-expired"));
    }
  }
  return r;
};

function LoginScreen({ onLogin }) {
  const C = useTheme();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await _origFetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password: pw }),
      });
      const d = await r.json();
      if (d.success) {
        if (d.token) localStorage.setItem(TOKEN_KEY, d.token);
        onLogin();
      } else {
        setErr(d.error || "登入失敗");
      }
    } catch {
      setErr("連線失敗，請再試一次");
    }
    setBusy(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <form onSubmit={submit} style={{
        width: "100%", maxWidth: 340, background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 16, padding: "36px 28px",
        boxShadow: C.shadowPop, textAlign: "center",
      }}>
        <div style={{ fontSize: 34, color: C.gold, fontFamily: "Georgia,serif", marginBottom: 6 }}>✦</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif", letterSpacing: "0.08em" }}>GONY</div>
        <div style={{ fontSize: 12, color: C.sage, marginBottom: 28 }}>西裝店管理系統</div>
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="請輸入密碼" autoFocus
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 16,
            background: C.bg, border: `1px solid ${err ? C.red || "#c0392b" : C.border}`,
            color: C.ivory, outline: "none", marginBottom: 12, boxSizing: "border-box",
          }}
        />
        {err && <div style={{ fontSize: 12, color: C.red || "#e74c3c", marginBottom: 10 }}>{err}</div>}
        <button type="submit" disabled={busy} style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "none",
          background: busy ? C.border : C.gold, color: "#1a1a1a",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
        }}>
          {busy ? "登入中..." : "登入"}
        </button>
      </form>
    </div>
  );
}

function AuthGate({ children }) {
  // checking：開站確認是否需要登入；login：顯示登入頁；ok：進入系統
  const [state, setState] = useState(localStorage.getItem(TOKEN_KEY) ? "ok" : "checking");

  useEffect(() => {
    const onExpired = () => setState("login");
    window.addEventListener("gony-auth-expired", onExpired);
    return () => window.removeEventListener("gony-auth-expired", onExpired);
  }, []);

  useEffect(() => {
    if (state !== "checking") return;
    // 沒有權杖：探測伺服器是否有設密碼（沒設就直接進入）
    _origFetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password: "" }),
    })
      .then(r => r.json())
      .then(d => setState(d.success && d.authDisabled ? "ok" : "login"))
      .catch(() => setState("login"));
  }, [state]);

  if (state === "checking") return null;
  if (state === "login") return <LoginScreen onLogin={() => setState("ok")} />;
  return children;
}

// ── 展開側邊欄的完整選色器 ──────────────────────────────────────────
function ThemePicker() {
  const C = useTheme();
  const { accentKey, bgKey, setAccent, setBg } = useThemeControl();

  const Row = ({ label, children }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.sage, fontWeight: 700, marginBottom: 6,
        letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ padding: "12px 12px 10px", borderTop: `1px solid ${C.border}` }}>
      <Row label="背景">
        {BG_THEMES.map(t => (
          <button key={t.key} onClick={() => setBg(t.key)} title={t.name} style={{
            width: 26, height: 26, borderRadius: 6, cursor: "pointer",
            background: t.preview,
            border: bgKey === t.key ? `2px solid ${C.gold}` : `2px solid ${C.border}`,
            flexShrink: 0,
          }} />
        ))}
      </Row>
      <Row label="強調色">
        {ACCENT_THEMES.map(t => (
          <button key={t.key} onClick={() => setAccent(t.key)} title={t.name} style={{
            width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
            background: t.accent,
            border: accentKey === t.key ? `2px solid ${C.ivory}` : `2px solid transparent`,
            flexShrink: 0,
          }} />
        ))}
      </Row>
    </div>
  );
}

// ── 收起側邊欄的圓點按鈕（點擊展開浮層，fixed 定位避免被 overflow:hidden 裁切）──
function ThemePickerDot() {
  const C = useTheme();
  const { accentKey, bgKey, setAccent, setBg } = useThemeControl();
  const [open, setOpen] = useState(false);
  const currentAccent = ACCENT_THEMES.find(t => t.key === accentKey);
  const currentBg     = BG_THEMES.find(t => t.key === bgKey);

  return (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} title="主題顏色" style={{
        width: "100%", background: "transparent", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "center",
        alignItems: "center", padding: "8px 0",
      }}>
        <span style={{ position: "relative", display: "inline-flex", width: 18, height: 18 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4,
            background: currentBg?.preview || C.bg,
            border: `1px solid ${C.border}`, display: "block",
          }} />
          <span style={{
            position: "absolute", bottom: -2, right: -2,
            width: 9, height: 9, borderRadius: "50%",
            background: currentAccent?.accent || C.gold,
            border: `1px solid ${C.card}`, display: "block",
          }} />
        </span>
      </button>

      {/* fixed 定位，跳出 overflow:hidden 的側邊欄 */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 59,
          }} />
          <div style={{
            position: "fixed", bottom: 16, left: SIDEBAR_W + 8,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "14px", zIndex: 60,
            minWidth: 190, boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 8,
              letterSpacing: "0.06em" }}>背景</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {BG_THEMES.map(t => (
                <button key={t.key} onClick={() => { setBg(t.key); }} title={t.name} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  background: "transparent", border: "none", cursor: "pointer", padding: 2,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, display: "block",
                    background: t.preview,
                    border: bgKey === t.key ? `2px solid ${C.gold}` : `2px solid ${C.border}`,
                    boxShadow: bgKey === t.key ? `0 0 0 1px ${C.gold}` : "none",
                  }} />
                  <span style={{ fontSize: 9, color: bgKey === t.key ? C.gold : C.sage, whiteSpace: "nowrap" }}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 8,
              letterSpacing: "0.06em" }}>強調色</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ACCENT_THEMES.map(t => (
                <button key={t.key} onClick={() => { setAccent(t.key); }} title={t.name} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  background: "transparent", border: "none", cursor: "pointer", padding: 2,
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", display: "block",
                    background: t.accent,
                    border: accentKey === t.key ? `2px solid ${C.ivory}` : `2px solid transparent`,
                    boxShadow: accentKey === t.key ? `0 0 0 1px ${t.accent}` : "none",
                  }} />
                  <span style={{ fontSize: 9, color: accentKey === t.key ? C.gold : C.sage, whiteSpace: "nowrap" }}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
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
        boxShadow: C.shadowPop,
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

        {open ? <ThemePicker /> : <ThemePickerDot />}
      </div>
    </>
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
      boxShadow: C.shadowCard,
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
      {localStorage.getItem(TOKEN_KEY) && (
        <button
          onClick={() => {
            if (window.confirm("確定要登出嗎？")) {
              localStorage.removeItem(TOKEN_KEY);
              window.location.reload();
            }
          }}
          title="登出"
          style={{
            marginLeft: "auto", background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 8, cursor: "pointer", color: C.sage, fontSize: 12,
            padding: "5px 10px", fontWeight: 700,
          }}>
          登出
        </button>
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
        <AuthGate>
        <Layout>
          <Routes>
            <Route path="/" element={<Orders />} />
            <Route path="/order" element={<OrderEntry />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/tracking" element={<DispatchTracking />} />
            <Route path="/expense" element={<QuickExpense />} />
            <Route path="/wages" element={<Wages />} />
            <Route path="/wage-calc" element={<WageCalc />} />
          </Routes>
        </Layout>
        </AuthGate>
      </ThemeProvider>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
