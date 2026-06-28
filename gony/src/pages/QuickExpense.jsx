import { useState } from "react";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  green: "#5E9E6E", red: "#E05252", mid: "#2A3A50",
};

const ACCOUNTS = ["🏦 銀行", "💵 現金", "💳 信用卡"];
const CATEGORIES = ["材料成本", "人事成本", "固定成本", "其他支出", "其他收入"];

export default function QuickExpense() {
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
