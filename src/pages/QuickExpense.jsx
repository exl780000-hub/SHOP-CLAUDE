import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

const ACCOUNTS = ["🏦 銀行", "💵 現金", "💳 信用卡"];
const CATEGORIES = ["材料成本", "人事成本", "固定成本", "其他支出", "其他收入"];

function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Btn({ label, active, onClick, C }) {
  return (
    <button onClick={onClick} style={{
      cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, padding: "12px 8px", flex: 1,
      border: `1px solid ${active ? C.gold : C.border}`,
      background: active ? C.gold + "22" : C.mid, color: active ? C.gold : C.sage,
    }}>{label}</button>
  );
}

function Sec({ title, accent, children }) {
  const C = useTheme();
  return (
    <div style={{ background: C.card, border: `1px solid ${accent || C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 14, boxShadow: C.shadowCard }}>
      {title && <div style={{ fontSize: 12, color: accent || C.gold, fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>{title}</div>}
      {children}
    </div>
  );
}

// ─── 月報表頁籤 ───────────────────────────────────────────────────────────────
function TrendChart({ C, data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(1, ...data.flatMap(d => [d.totalCompanyFee, d.totalOrderProfit, d.totalCost]));
  const Legend = ({ color, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
      <span style={{ fontSize: 10, color: C.sage }}>{label}</span>
    </div>
  );
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14, boxShadow: C.shadowCard }}>
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 10 }}>📈 近 {data.length} 個月趨勢</div>
      <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
        <Legend color={C.blue} label="公司費" />
        <Legend color={C.green} label="利潤" />
        <Legend color={C.red} label="固定成本" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
        {data.map(d => (
          <div key={d.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
              <div title="公司費" style={{ width: 7, height: `${Math.max(2, d.totalCompanyFee / max * 100)}%`, background: C.blue, borderRadius: "2px 2px 0 0" }} />
              <div title="利潤" style={{ width: 7, height: `${Math.max(2, d.totalOrderProfit / max * 100)}%`, background: C.green, borderRadius: "2px 2px 0 0" }} />
              <div title="固定成本" style={{ width: 7, height: `${Math.max(2, d.totalCost / max * 100)}%`, background: C.red + "99", borderRadius: "2px 2px 0 0" }} />
            </div>
            <div style={{ fontSize: 9, color: C.sage, marginTop: 4 }}>{d.month.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const C = useTheme();
  const isWide = useIsWide();
  const now = new Date();
  const [month, setMonth] = useState(monthStr(now));
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (m) => {
    setLoading(true);
    try {
      const [r, rt] = await Promise.all([
        fetch(`/api/finance-summary?month=${m}`),
        fetch(`/api/finance-summary?trend=1&month=${m}&months=6`),
      ]);
      const d = await r.json();
      if (d.success) setSummary(d);
      const dt = await rt.json();
      if (dt.success) setTrend(dt.trend);
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

  const Sec = ({ title, accent, children }) => (
    <div style={{ background: C.card, border: `1px solid ${accent||C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14, boxShadow: C.shadowCard }}>
      {title && <div style={{ fontSize: 12, color: accent||C.gold, fontWeight: 700, marginBottom: 12, letterSpacing:"0.05em" }}>{title}</div>}
      {children}
    </div>
  );
  const Row = ({ label, value, color, bold }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: bold ? C.ivory : C.sage, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? 16 : 13, fontWeight: bold ? 700 : 600, color: color || C.ivory, fontFamily: "Georgia,serif" }}>{value}</span>
    </div>
  );

  const s = summary;
  const netColor = !s ? C.sage : s.netProfit >= 0 ? C.green : C.red;

  return (
    <div style={{ maxWidth: isWide?900:520, margin: "0 auto", padding: "14px 14px 80px" }}>
      {/* 月份切換 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, background: C.card, borderRadius: 14, padding: "10px 16px", border: `1px solid ${C.border}`, boxShadow: C.shadowCard }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", color: C.sage, fontSize: 22, cursor: "pointer", padding: "0 8px" }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>{month}</div>
        <button onClick={nextMonth} style={{ background: "none", border: "none", color: C.sage, fontSize: 22, cursor: "pointer", padding: "0 8px", opacity: month >= monthStr(now) ? 0.3 : 1 }}>›</button>
      </div>

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}

      {!loading && s && (<>

        {/* ① 公司費 vs 固定成本回本進度（不含利潤） */}
        <Sec title="🏢 公司費回本進度" accent={C.blue}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, textAlign: "center", background: C.mid, borderRadius: 10, padding: "10px 4px" }}>
              <div style={{ fontSize: 9, color: C.sage, marginBottom: 4 }}>本月公司費</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, fontFamily: "Georgia,serif" }}>${s.totalCompanyFee.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: C.mid, borderRadius: 10, padding: "10px 4px" }}>
              <div style={{ fontSize: 9, color: C.sage, marginBottom: 4 }}>固定成本合計</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: "Georgia,serif" }}>${s.totalCost.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: C.mid, borderRadius: 10, padding: "10px 4px" }}>
              <div style={{ fontSize: 9, color: C.sage, marginBottom: 4 }}>結餘</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.fixedCostBalance >= 0 ? C.green : C.red, fontFamily: "Georgia,serif" }}>
                {s.fixedCostBalance >= 0 ? "+" : "-"}${Math.abs(s.fixedCostBalance).toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: C.sage }}>回本進度（只算公司費，不含利潤）</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{Math.round(s.coverRate * 100)}%</span>
          </div>
          <div style={{ height: 8, background: C.mid, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round(s.coverRate * 100)}%`, background: s.coverRate >= 1 ? C.green : C.gold, borderRadius: 4, transition: "width 0.4s" }} />
          </div>
        </Sec>

        {/* ② 訂單利潤（獨立呈現，不併入回本進度） */}
        <Sec title={`💰 訂單利潤（${s.orderCount} 筆，獨立於公司費）`} accent={C.green}>
          <div style={{ textAlign: "center", marginBottom: s.orderDetails.length ? 12 : 0 }}>
            <div style={{ fontSize: 9, color: C.sage, marginBottom: 4 }}>本月利潤合計</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.green, fontFamily: "Georgia,serif" }}>${s.totalOrderProfit.toLocaleString()}</div>
          </div>
          {s.orderDetails.length === 0
            ? <div style={{ color: C.sage, fontSize: 13 }}>本月尚無訂單</div>
            : s.orderDetails.map((o, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.ivory, fontWeight: 600, marginBottom: 4 }}>{o.name}</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 11, color: C.sage }}>公司費 <span style={{ color: C.blue, fontWeight: 700 }}>${o.companyFee.toLocaleString()}</span></span>
                  <span style={{ fontSize: 11, color: C.sage }}>利潤 <span style={{ color: C.green, fontWeight: 700 }}>${o.profit.toLocaleString()}</span></span>
                  <span style={{ fontSize: 11, color: C.sage }}>售價 <span style={{ color: C.gold, fontWeight: 700 }}>${o.actual.toLocaleString()}</span></span>
                </div>
              </div>
            ))}
        </Sec>

        {/* ③ 固定成本明細 */}
        <Sec title="🏢 固定成本明細" accent={C.red}>
          <Row label="基本固定成本（月）" value={`$${s.baseCost.toLocaleString()}`} color={C.red} />
          {s.extraItems.map((item, i) => (
            <Row key={i} label={item.name} value={`$${item.amount.toLocaleString()}`} color={C.red} />
          ))}
          <Row label="固定成本合計" value={`$${s.totalCost.toLocaleString()}`} color={C.red} bold />
        </Sec>

        {/* ④ 最終月收益（公司費結餘 + 利潤，最後才加總） */}
        <div style={{ background: C.card, border: `2px solid ${netColor}55`, borderRadius: 14, padding: "16px", marginBottom: 14, boxShadow: C.shadowCard }}>
          <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 10 }}>📊 本月最終收益（公司費結餘 + 利潤）</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: C.sage, marginBottom: 8 }}>
            <span style={{ color: s.fixedCostBalance >= 0 ? C.green : C.red, fontWeight: 700 }}>
              {s.fixedCostBalance >= 0 ? "+" : "-"}${Math.abs(s.fixedCostBalance).toLocaleString()}
            </span>
            <span>公司費結餘</span>
            <span>+</span>
            <span style={{ color: C.green, fontWeight: 700 }}>${s.totalOrderProfit.toLocaleString()}</span>
            <span>利潤</span>
          </div>
          <div style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: netColor, fontFamily: "Georgia,serif" }}>
            {s.netProfit >= 0 ? "+" : "-"}${Math.abs(s.netProfit).toLocaleString()}
          </div>
        </div>

        {/* ⑤ 近 6 個月加總趨勢圖 */}
        <TrendChart C={C} data={trend} />

        {/* 待收付 */}
        {(s.pendingIn > 0 || s.pendingOut > 0) && (
          <Sec title="⏳ 待收 / 待付">
            {s.pendingList.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.ivory }}>{p.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: p.type === "收" ? C.green : C.red, fontFamily: "Georgia,serif" }}>
                  {p.type === "收" ? "+" : "-"}${Number(p.amount).toLocaleString()}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              {s.pendingIn > 0 && <div style={{ flex: 1, textAlign: "center", background: C.green+"15", borderRadius: 8, padding: "8px" }}>
                <div style={{ fontSize: 9, color: C.sage }}>待收</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: "Georgia,serif" }}>${s.pendingIn.toLocaleString()}</div>
              </div>}
              {s.pendingOut > 0 && <div style={{ flex: 1, textAlign: "center", background: C.red+"15", borderRadius: 8, padding: "8px" }}>
                <div style={{ fontSize: 9, color: C.sage }}>待付</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: "Georgia,serif" }}>${s.pendingOut.toLocaleString()}</div>
              </div>}
            </div>
          </Sec>
        )}

      </>)}

    </div>
  );
}

// ─── 快速記帳頁籤 ──────────────────────────────────────────────────────────────
function Expense() {
  const C = useTheme();
  const isWide = useIsWide();
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



  return (
    <div style={{ maxWidth: isWide?900:520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <Sec title="💰 收支類型">
        <div style={{ display: "flex", gap: 8 }}>
          <Btn label="💸 支出" active={type === "💸 支出"} onClick={() => setType("💸 支出")} C={C} />
          <Btn label="💵 收入" active={type === "💵 收入"} onClick={() => setType("💵 收入")} C={C} />
        </div>
      </Sec>

      <Sec title="🏦 帳戶">
        <div style={{ display: "flex", gap: 8 }}>
          {ACCOUNTS.map(a => <Btn key={a} label={a} active={account === a} onClick={() => setAccount(a)} C={C} />)}
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
