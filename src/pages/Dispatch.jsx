import { useState, useEffect } from "react";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  red: "#E05252", green: "#5E9E6E", mid: "#2A3A50",
};

const DISPATCH_TYPES = [
  { type: "📐 打版單",    tailors: ["經理"],                    content: "full" },
  { type: "🧵 毛胚製作單", tailors: ["駐店師傅", "經理"],         content: "styles" },
  { type: "👔 外套製作單", tailors: ["外套師傅"],                content: "jacket" },
  { type: "👖 褲子製作單", tailors: ["褲子師傅"],                content: "trouser" },
  { type: "🦺 背心製作單", tailors: ["外套師傅", "褲子師傅"],     content: "vest" },
  { type: "✂️ 外套修改單", tailors: ["外套師傅"],                content: "alter-jacket" },
  { type: "✂️ 褲子修改單", tailors: ["駐店師傅"],                content: "alter-trouser" },
];

// 修改項目定義（含工資供參考，不顯示給師傅）
const ALTER_JACKET = [
  { key: "肩領",   wage: 300 },
  { key: "袖子",   wage: 200 },
  { key: "腰身",   wage: 250 },
  { key: "袖長單手", wage: 80 },
  { key: "袖長雙手", wage: 160 },
];
const ALTER_TROUSER = [
  { key: "腰身",  wage: 250 },
  { key: "褲長",  wage: 100 },
  { key: "褲腳",  wage: 100 },
  { key: "褲管",  wage: 150 },
  { key: "臀圍",  wage: 200 },
];

function AlterBlock({ items, checked, onToggle, extraNote, onNote }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {items.map(({ key }) => {
          const active = checked.includes(key);
          return (
            <button key={key} onClick={() => onToggle(key)} style={{
              cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 14px",
              border: `1px solid ${active ? C.gold : C.border}`,
              background: active ? C.gold + "22" : C.mid,
              color: active ? C.gold : C.sage,
            }}>
              {active ? "☑ " : "☐ "}{key}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.sage, marginBottom: 5 }}>特殊說明（選填）</div>
      <textarea value={extraNote} onChange={e => onNote(e.target.value)} placeholder="其他修改要求..."
        style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 13, outline: "none", resize: "vertical", minHeight: 55 }} />
    </div>
  );
}

export default function Dispatch() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dtype, setDtype] = useState(null);
  const [tailor, setTailor] = useState("");
  const [deadline, setDeadline] = useState("");
  const [alterChecked, setAlterChecked] = useState([]);
  const [alterNote, setAlterNote] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const doSearch = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/orders?q=${encodeURIComponent(search)}`);
      const d = await r.json();
      setOrders(d.orders || []);
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setLoading(false);
  };

  useEffect(() => { doSearch(); }, []);

  const toggleAlter = (key) => {
    setAlterChecked(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const isAlter = dtype?.content === "alter-jacket" || dtype?.content === "alter-trouser";
  const alterItems = dtype?.content === "alter-jacket" ? ALTER_JACKET : ALTER_TROUSER;

  const buildContent = (order, content) => {
    if (content === "jacket")  return `外套樣式\n${order.jacketStyle || "—"}`;
    if (content === "trouser") return `褲子樣式\n${order.trouserStyle || "—"}`;
    if (content === "vest")    return `背心樣式\n${order.vestStyle || "—"}`;
    if (content === "styles")  return `【樣式明細】\n外套：${order.jacketStyle || "—"}\n褲子：${order.trouserStyle || "—"}\n背心：${order.vestStyle || "—"}`;
    if (content === "full")    return `【完整製作資訊】\n外套：${order.jacketStyle || "—"}\n褲子：${order.trouserStyle || "—"}\n背心：${order.vestStyle || "—"}\n（量身尺寸請見訂單關聯量身記錄）`;
    if (content === "alter-jacket" || content === "alter-trouser") {
      const lines = alterChecked.length > 0
        ? alterChecked.map(k => `• ${k}`).join("\n")
        : "（未勾選項目）";
      return `修改項目：\n${lines}${alterNote ? `\n特殊：${alterNote}` : ""}`;
    }
    return "";
  };

  const submit = async () => {
    if (!selected || !dtype || !tailor) return;
    setSubmitting(true);
    setResult(null);
    try {
      const content = buildContent(selected, dtype.content);
      const r = await fetch("/api/create-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.id, orderName: selected.name,
          dispatchType: dtype.type, tailor, deadline, content,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setResult({ ok: true, msg: "派工單已建立！", url: d.dispatchUrl });
      setDtype(null); setTailor(""); setDeadline("");
      setAlterChecked([]); setAlterNote("");
    } catch (e) {
      setResult({ ok: false, msg: e.message });
    }
    setSubmitting(false);
  };

  const handleSelectDtype = (dt) => {
    setDtype(dt);
    setTailor(dt.tailors[0]);
    setAlterChecked([]);
    setAlterNote("");
  };

  const Sec = ({ title, children }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
      {title && <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <Sec title="🔍 選擇訂單">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="客戶名或訂單編號"
            onKeyDown={e => e.key === "Enter" && doSearch()}
            style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
          <button onClick={doSearch} style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>搜尋</button>
        </div>
        {loading && <div style={{ color: C.sage, fontSize: 13 }}>載入中...</div>}
        {orders.map(o => (
          <div key={o.id} onClick={() => setSelected(o)} style={{
            padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
            background: selected?.id === o.id ? C.gold + "22" : C.mid,
            border: `1px solid ${selected?.id === o.id ? C.gold : C.border}`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{o.name}</div>
            <div style={{ fontSize: 11, color: C.sage }}>{o.orderNo} · {o.items} · {o.flow}</div>
          </div>
        ))}
      </Sec>

      {selected && (
        <Sec title="📋 派工類型">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DISPATCH_TYPES.map(dt => (
              <button key={dt.type} onClick={() => handleSelectDtype(dt)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 12px",
                border: `1px solid ${dtype?.type === dt.type ? C.gold : C.border}`,
                background: dtype?.type === dt.type ? C.gold + "22" : C.mid,
                color: dtype?.type === dt.type ? C.gold : C.sage,
              }}>{dt.type}</button>
            ))}
          </div>
        </Sec>
      )}

      {dtype && (
        <Sec title="👨‍🏭 指派師傅 / 期限">
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {dtype.tailors.map(t => (
              <button key={t} onClick={() => setTailor(t)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 14px",
                border: `1px solid ${tailor === t ? C.gold : C.border}`,
                background: tailor === t ? C.gold + "22" : C.mid,
                color: tailor === t ? C.gold : C.sage,
              }}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 5 }}>製作完成期限</div>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
        </Sec>
      )}

      {isAlter && (
        <Sec title="✂️ 修改項目">
          <AlterBlock
            items={alterItems}
            checked={alterChecked}
            onToggle={toggleAlter}
            extraNote={alterNote}
            onNote={setAlterNote}
          />
          {alterChecked.length > 0 && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: C.mid, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.sage, marginBottom:4 }}>已勾選</div>
              <div style={{ fontSize: 13, color: C.gold }}>{alterChecked.join("、")}</div>
            </div>
          )}
        </Sec>
      )}

      {result && (
        <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: (result.ok ? C.green : C.red) + "22", border: `1px solid ${(result.ok ? C.green : C.red)}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: result.ok ? C.green : C.red }}>{result.ok ? "✅ " : "❌ "}{result.msg}</div>
          {result.url && <a href={result.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.gold }}>→ 開啟派工單（傳給師傅）</a>}
        </div>
      )}

      {dtype && tailor && (
        <button onClick={submit} disabled={submitting} style={{
          width: "100%", padding: "15px", borderRadius: 12, border: "none",
          background: submitting ? C.mid : C.gold, color: submitting ? C.sage : C.bg,
          fontSize: 15, fontWeight: 700, cursor: submitting ? "default" : "pointer",
        }}>{submitting ? "建立中..." : "✦ 建立派工單"}</button>
      )}
    </div>
  );
}
