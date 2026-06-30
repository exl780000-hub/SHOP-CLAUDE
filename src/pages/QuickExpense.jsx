import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";

const ACCOUNTS = ["🏦 銀行", "💵 現金", "💳 信用卡"];
const CATEGORIES = ["材料成本", "人事成本", "固定成本", "其他支出", "其他收入"];

function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── 工資月結區塊 ─────────────────────────────────────────────────────────────
function WageSettlement({ month }) {
  const C = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`/api/wage-settlement?month=${month}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const settle = async () => {
    if (!data?.byTailor?.length) return;
    setSettling(true);
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, tailors: data.byTailor.map(t => ({ tailor: t.tailor, total: t.total })) }),
      });
      const d = await r.json();
      setResult({ ok: d.success, msg: d.success ? d.message : d.error });
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setSettling(false);
  };

  if (!data && !loading) {
    return (
      <button onClick={load} style={{ width: "100%", padding: "12px", borderRadius: 10,
        border: `1px solid ${C.border}`, background: "transparent", color: C.sage, fontSize: 13,
        fontWeight: 600, cursor: "pointer" }}>🧾 載入工資月結預覽</button>
    );
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 12 }}>🧾 師傅工資月結</div>
      {loading && <div style={{ color: C.sage, fontSize: 13 }}>載入中...</div>}
      {data && !loading && (
        <>
          {data.byTailor.length === 0 ? (
            <div style={{ color: C.sage, fontSize: 13 }}>本月無已完成且填寫工資的派工單</div>
          ) : (
            <>
              {data.byTailor.map(t => (
                <div key={t.tailor} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>{t.tailor}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${t.total.toLocaleString()}</span>
                  </div>
                  {t.items.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderLeft: `2px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, color: C.sage }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: C.ivory }}>${item.wage.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${C.border}`, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>工資合計</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${data.total.toLocaleString()}</span>
              </div>
              {result && (
                <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8,
                  background: (result.ok ? C.green : C.red) + "22", fontSize: 12, fontWeight: 700,
                  color: result.ok ? C.green : C.red }}>
                  {result.ok ? "✅ " : "❌ "}{result.msg}
                </div>
              )}
              {!result?.ok && (
                <button onClick={settle} disabled={settling} style={{ width: "100%", padding: "10px",
                  borderRadius: 8, border: "none", background: settling ? C.mid : C.green,
                  color: settling ? C.sage : "#fff", fontSize: 13, fontWeight: 700, cursor: settling ? "default" : "pointer" }}>
                  {settling ? "結算中..." : `確認結算 ${month}`}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── 月報表頁籤 ───────────────────────────────────────────────────────────────
function Dashboard() {
  const C = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(monthStr(now));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (m) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/finance-summary?month=${m}`);
      const d = await r.json();
      if (d.success) setSummary(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(month); }, [month]);

  const prevMonth = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() - 1);
    setMonth(monthStr(d));
  };
  const nextMonth = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + 1);
    if (d <= now) setMonth(monthStr(d));
  };

  const Stat = ({ label, value, color, big }) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: C.sage, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: big ? 22 : 17, fontWeight: 700, color: color || C.ivory, fontFamily: "Georgia,serif" }}>
        ${Number(value || 0).toLocaleString()}
      </div>
    </div>
  );

  const Sec = ({ title, children }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      {/* 月份切換 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, background: C.card, borderRadius: 12, padding: "10px 16px", border: `1px solid ${C.border}` }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", color: C.sage, fontSize: 22, cursor: "pointer", padding: "0 8px" }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>{month}</div>
        <button onClick={nextMonth} style={{ background: "none", border: "none", color: C.sage, fontSize: 22, cursor: "pointer", padding: "0 8px", opacity: month >= monthStr(now) ? 0.3 : 1 }}>›</button>
      </div>

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}

      {!loading && summary && (
        <>
          {/* 收支總覽 */}
          <Sec title="📊 本月收支">
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Stat label="營收" value={summary.income} color={C.green} big />
              <Stat label="支出" value={summary.expense} color={C.red} big />
            </div>
            <div style={{ padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>本月利潤</span>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", color: summary.profit >= 0 ? C.green : C.red }}>
                  {summary.profit >= 0 ? "+" : ""}${Number(summary.profit).toLocaleString()}
                </span>
              </div>
            </div>
          </Sec>

          {/* 待收尾款 */}
          {summary.pendingIn > 0 && (
            <Sec title="⏳ 待收款">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.sage }}>合計待收</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${Number(summary.pendingIn).toLocaleString()}</span>
              </div>
              {summary.pendingList.filter(p => p.type === "收").map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.ivory }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${Number(p.amount).toLocaleString()}</span>
                </div>
              ))}
            </Sec>
          )}

          {/* 待付款 */}
          {summary.pendingOut > 0 && (
            <Sec title="⏳ 待付款">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.sage }}>合計待付</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.red, fontFamily: "Georgia,serif" }}>${Number(summary.pendingOut).toLocaleString()}</span>
              </div>
              {summary.pendingList.filter(p => p.type === "付").map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.ivory }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.red, fontFamily: "Georgia,serif" }}>${Number(p.amount).toLocaleString()}</span>
                </div>
              ))}
            </Sec>
          )}

          {summary.pendingIn === 0 && summary.pendingOut === 0 && (
            <div style={{ textAlign: "center", color: C.sage, fontSize: 13, padding: "20px 0" }}>✅ 本月無待收/待付款項</div>
          )}
        </>
      )}

      {/* 工資月結 */}
      <WageSettlement month={month} />
    </div>
  );
}

// ─── 快速記帳頁籤 ──────────────────────────────────────────────────────────────
function Expense() {
  const C = useTheme();
  const [type, setType] = useState("💸 支出");
  const [account, setAccount] = useState("💵 現金");
  const [category, setCategory] = useState("其他支出");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!amount) return;
    setSubmitting(true); setResult(null);
    try {
      const r = await fetch("/api/expense", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, account, category, amount: Number(amount), name, note }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setResult({ ok: true, msg: "記帳成功！" });
      setAmount(""); setName(""); setNote("");
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setSubmitting(false);
  };

  const genFixedCost = async () => {
    setSubmitting(true); setResult(null);
    try {
      const r = await fetch("/api/expense", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fixed-cost" }),
      });
      const d = await r.json();
      setResult({ ok: d.success, msg: d.success ? d.message : d.error });
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setSubmitting(false);
  };

  const Sec = ({ title, children }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
      {title && <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );

  const Btn = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{
      cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, padding: "12px 8px", flex: 1,
      border: `1px solid ${active ? C.gold : C.border}`,
      background: active ? C.gold + "22" : C.mid, color: active ? C.gold : C.sage,
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <Sec title="💰 收支類型">
        <div style={{ display: "flex", gap: 8 }}>
          <Btn label="💸 支出" active={type === "💸 支出"} onClick={() => setType("💸 支出")} />
          <Btn label="💵 收入" active={type === "💵 收入"} onClick={() => setType("💵 收入")} />
        </div>
      </Sec>

      <Sec title="🏦 帳戶">
        <div style={{ display: "flex", gap: 8 }}>
          {ACCOUNTS.map(a => <Btn key={a} label={a} active={account === a} onClick={() => setAccount(a)} />)}
        </div>
      </Sec>

      <Sec title="📂 分類">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 14px",
              border: `1px solid ${category === c ? C.gold : C.border}`,
              background: category === c ? C.gold + "22" : C.mid, color: category === c ? C.gold : C.sage,
            }}>{c}</button>
          ))}
        </div>
      </Sec>

      <Sec title="💵 金額 / 說明">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="金額"
          style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `2px solid ${C.gold}`, borderRadius: 8, padding: "12px 14px", color: C.ivory, fontSize: 20, fontWeight: 700, outline: "none", marginBottom: 10 }} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="項目名稱（例：布料、文具）"
          style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 14, outline: "none", marginBottom: 10 }} />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="備註（選填）"
          style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
      </Sec>

      {result && (
        <div style={{ marginBottom: 12, padding: "12px 16px", borderRadius: 10, background: (result.ok ? C.green : C.red) + "22", border: `1px solid ${(result.ok ? C.green : C.red)}44`, fontSize: 13, fontWeight: 700, color: result.ok ? C.green : C.red }}>
          {result.ok ? "✅ " : "❌ "}{result.msg}
        </div>
      )}

      <button onClick={submit} disabled={submitting || !amount} style={{
        width: "100%", padding: "15px", borderRadius: 12, border: "none",
        background: (submitting || !amount) ? C.mid : C.gold, color: (submitting || !amount) ? C.sage : C.bg,
        fontSize: 15, fontWeight: 700, cursor: (submitting || !amount) ? "default" : "pointer", marginBottom: 12,
      }}>{submitting ? "處理中..." : "✦ 記一筆"}</button>

      <button onClick={genFixedCost} disabled={submitting} style={{
        width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`,
        background: "transparent", color: C.sage, fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}>📅 產生本月固定成本 $97,649</button>
    </div>
  );
}

// ─── 主頁面（頁籤切換）────────────────────────────────────────────────────────
export default function QuickExpense() {
  const C = useTheme();
  const [tab, setTab] = useState("expense");

  return (
    <div style={{ background: C.bg, color: C.ivory, fontFamily: "-apple-system,'Segoe UI',sans-serif" }}>
      {/* 頁籤 */}
      <div style={{ display: "flex", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {[
          { key: "expense", label: "快速記帳" },
          { key: "dashboard", label: "月報表" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, background: "none", border: "none", padding: "12px",
            borderBottom: `2px solid ${tab === t.key ? C.gold : "transparent"}`,
            color: tab === t.key ? C.gold : C.sage, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "expense" && <Expense />}
      {tab === "dashboard" && <Dashboard />}
    </div>
  );
}
