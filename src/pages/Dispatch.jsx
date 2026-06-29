import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";

const DISPATCH_TYPES = [
  { type: "📐 打版單",    tailors: ["經理"],                    content: "full",          flows: ["📐 打版"] },
  { type: "🧵 毛胚製作單", tailors: ["駐店師傅", "經理"],         content: "styles",        flows: ["🪡 製作毛胚"] },
  { type: "👔 外套製作單", tailors: ["外套師傅"],                content: "jacket",        flows: ["✂️ 開始製作"] },
  { type: "👖 褲子製作單", tailors: ["褲子師傅"],                content: "trouser",       flows: ["✂️ 開始製作"] },
  { type: "🦺 背心製作單", tailors: ["外套師傅", "褲子師傅"],     content: "vest",          flows: ["✂️ 開始製作"] },
  { type: "✂️ 外套修改單", tailors: ["外套師傅"],                content: "alter-jacket",  flows: ["🧍 第二試身"], label: "外套成品製作" },
  { type: "✂️ 褲子修改單", tailors: ["駐店師傅"],                content: "alter-trouser", flows: ["🧍 第二試身"], label: "褲子成品製作" },
];

const FLOW_RECOMMEND = {
  "📐 打版":    ["📐 打版單"],
  "🪡 製作毛胚": ["🧵 毛胚製作單"],
  "✂️ 開始製作": ["👔 外套製作單", "👖 褲子製作單", "🦺 背心製作單"],
  "🧍 第二試身": ["✂️ 外套修改單", "✂️ 褲子修改單"],
};

const DISPATCH_FLOW_PREVIEW = {
  "📐 打版單":    "📐 打版",
  "🧵 毛胚製作單": "🪡 製作毛胚",
  "👔 外套製作單": "✂️ 開始製作",
  "👖 褲子製作單": "✂️ 開始製作",
  "🦺 背心製作單": "✂️ 開始製作",
  "✂️ 外套修改單": "🪢 最後縫製（成品製作）",
  "✂️ 褲子修改單": "🪢 最後縫製（成品製作）",
};

const ALTER_JACKET = [
  { key: "肩領", wage: 300 }, { key: "袖子", wage: 200 }, { key: "腰身", wage: 250 },
  { key: "袖長單手", wage: 80 }, { key: "袖長雙手", wage: 160 },
];
const ALTER_TROUSER = [
  { key: "腰身", wage: 250 }, { key: "褲長", wage: 100 }, { key: "褲腳", wage: 100 },
  { key: "褲管", wage: 150 }, { key: "臀圍", wage: 200 },
];

const STATUS_COLOR = {
  "⏳ 待完成": "#C9A84C",
  "✅ 完成":   "#5E9E6E",
  "❌ 取消":   "#E05252",
};

function AlterBlock({ items, checked, onToggle, extraNote, onNote }) {
  const C = useTheme();
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {items.map(({ key }) => {
          const active = checked.includes(key);
          return (
            <button key={key} onClick={() => onToggle(key)} style={{
              cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 14px",
              border: `1px solid ${active ? C.gold : C.border}`,
              background: active ? C.gold + "22" : C.mid, color: active ? C.gold : C.sage,
            }}>{active ? "☑ " : "☐ "}{key}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.sage, marginBottom: 5 }}>特殊說明（選填）</div>
      <textarea value={extraNote} onChange={e => onNote(e.target.value)} placeholder="其他製作要求..."
        style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 13, outline: "none",
          resize: "vertical", minHeight: 55 }} />
    </div>
  );
}

function Sec({ title, children, accent }) {
  const C = useTheme();
  return (
    <div style={{ background: C.card, border: `1px solid ${accent ? accent + "55" : C.border}`,
      borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
      {title && <div style={{ fontSize: 12, color: accent || C.gold, fontWeight: 700, marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

export default function Dispatch() {
  const C = useTheme();
  const [search, setSearch]                   = useState("");
  const [orders, setOrders]                   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [selected, setSelected]               = useState(null);
  const [orderDispatches, setOrderDispatches] = useState([]);
  const [loadingDisp, setLoadingDisp]         = useState(false);

  const [dtype, setDtype]             = useState(null);
  const [tailor, setTailor]           = useState("");
  const [deadline, setDeadline]       = useState("");
  const [alterChecked, setAlterChecked] = useState([]);
  const [alterNote, setAlterNote]     = useState("");
  const [result, setResult]           = useState(null);
  const [submitting, setSubmitting]   = useState(false);

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

  const loadOrderDispatches = async (orderId) => {
    setLoadingDisp(true);
    try {
      const r = await fetch(`/api/dispatches?orderId=${encodeURIComponent(orderId)}`);
      const d = await r.json();
      setOrderDispatches(d.dispatches || []);
    } catch (e) { setOrderDispatches([]); }
    setLoadingDisp(false);
  };

  const handleSelect = (o) => {
    setSelected(o);
    setDtype(null); setTailor(""); setDeadline("");
    setAlterChecked([]); setAlterNote(""); setResult(null);
    loadOrderDispatches(o.id);
  };

  const handleSelectDtype = (dt) => {
    setDtype(dt);
    setTailor(dt.tailors[0]);
    setAlterChecked([]);
    setAlterNote("");
  };

  const toggleAlter = (key) => {
    setAlterChecked(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const isAlter = dtype?.content === "alter-jacket" || dtype?.content === "alter-trouser";
  const alterItems = dtype?.content === "alter-jacket" ? ALTER_JACKET : ALTER_TROUSER;
  const recommendedTypes = selected ? (FLOW_RECOMMEND[selected.flow] || []) : [];

  const buildContent = (order, content) => {
    if (content === "jacket")  return `外套樣式\n${order.jacketStyle || "—"}`;
    if (content === "trouser") return `褲子樣式\n${order.trouserStyle || "—"}`;
    if (content === "vest")    return `背心樣式\n${order.vestStyle || "—"}`;
    if (content === "styles")  return `【樣式明細】\n外套：${order.jacketStyle || "—"}\n褲子：${order.trouserStyle || "—"}\n背心：${order.vestStyle || "—"}`;
    if (content === "full")    return `【完整製作資訊】\n外套：${order.jacketStyle || "—"}\n褲子：${order.trouserStyle || "—"}\n背心：${order.vestStyle || "—"}\n（量身尺寸請見訂單關聯量身記錄）`;
    if (content === "alter-jacket" || content === "alter-trouser") {
      const lines = alterChecked.length > 0 ? alterChecked.map(k => `• ${k}`).join("\n") : "（未勾選項目）";
      return `成品製作項目：\n${lines}${alterNote ? `\n特殊：${alterNote}` : ""}`;
    }
    return "";
  };

  const getStyleRef = () => {
    if (!selected || !dtype) return null;
    const c = dtype.content;
    if (c === "jacket"  && selected.jacketStyle)  return { label: "外套樣式", text: selected.jacketStyle };
    if (c === "trouser" && selected.trouserStyle) return { label: "褲子樣式", text: selected.trouserStyle };
    if (c === "vest"    && selected.vestStyle)    return { label: "背心樣式", text: selected.vestStyle };
    return null;
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
      setResult({ ok: true, msg: "派工單已建立！", url: d.dispatchUrl, flow: d.flowUpdated });
      loadOrderDispatches(selected.id);
      if (d.flowUpdated) {
        setSelected(prev => ({ ...prev, flow: d.flowUpdated }));
        setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, flow: d.flowUpdated } : o));
      }
      setDtype(null); setTailor(""); setDeadline("");
      setAlterChecked([]); setAlterNote("");
    } catch (e) {
      setResult({ ok: false, msg: e.message || "建立失敗，請重試" });
    } finally {
      setSubmitting(false);
    }
  };

  const ref = getStyleRef();
  const flowPreview = dtype ? DISPATCH_FLOW_PREVIEW[dtype.type] : null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* ① 搜尋訂單 */}
      <Sec title="🔍 選擇訂單">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="客戶名或訂單編號"
            onKeyDown={e => e.key === "Enter" && doSearch()}
            style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "9px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
          <button onClick={doSearch} style={{ background: C.gold, color: C.bg, border: "none",
            borderRadius: 8, padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>搜尋</button>
        </div>
        {loading && <div style={{ color: C.sage, fontSize: 13 }}>載入中...</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {orders.map(o => {
            const isSelected = selected?.id === o.id;
            return (
              <div key={o.id} onClick={() => handleSelect(o)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                background: isSelected ? C.gold + "22" : C.mid,
                border: `1px solid ${isSelected ? C.gold : C.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{o.flow}</div>
                </div>
                <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{o.orderNo} · {o.items}</div>
              </div>
            );
          })}
        </div>
      </Sec>

      {/* ② 訂單狀況 + 既有派工記錄 */}
      {selected && (
        <Sec title="📋 訂單狀況" accent={C.blue}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.sage }}>目前流程</span>
            <span style={{ background: C.mid, borderRadius: 8, padding: "5px 14px",
              fontSize: 13, fontWeight: 700, color: C.gold }}>
              {selected.flow || "未設定"}
            </span>
          </div>

          <div style={{ fontSize: 11, color: C.sage, marginBottom: 6 }}>已建立的派工單</div>
          {loadingDisp && <div style={{ fontSize: 12, color: C.sage }}>載入中...</div>}
          {!loadingDisp && orderDispatches.length === 0 && (
            <div style={{ fontSize: 12, color: C.border, padding: "6px 0" }}>尚無派工記錄</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {orderDispatches.map(dp => (
              <div key={dp.id} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: `1px solid ${C.border}44` }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.ivory }}>{dp.type}</span>
                  <span style={{ fontSize: 11, color: C.sage, marginLeft: 8 }}>{dp.tailor}</span>
                  {dp.deadline && (
                    <span style={{ fontSize: 10, color: C.border, marginLeft: 6 }}>期限 {dp.deadline}</span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700,
                  color: STATUS_COLOR[dp.status] || C.sage }}>{dp.status}</span>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* ③ 派工類型 */}
      {selected && (
        <Sec title="📋 派工類型">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DISPATCH_TYPES.map(dt => {
              const isRec    = recommendedTypes.includes(dt.type);
              const isActive = dtype?.type === dt.type;
              return (
                <button key={dt.type} onClick={() => handleSelectDtype(dt)} style={{
                  cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  padding: "9px 13px", position: "relative",
                  border: `1px solid ${isActive ? C.gold : isRec ? C.green : C.border}`,
                  background: isActive ? C.gold + "22" : isRec ? C.green + "18" : C.mid,
                  color: isActive ? C.gold : isRec ? C.green : C.sage,
                }}>
                  {dt.label || dt.type}
                  {isRec && !isActive && (
                    <span style={{ position: "absolute", top: -4, right: -4,
                      background: C.green, borderRadius: "50%", width: 8, height: 8, display: "block" }} />
                  )}
                </button>
              );
            })}
          </div>
          {recommendedTypes.length > 0 && (
            <div style={{ fontSize: 11, color: C.green, marginTop: 10 }}>
              ● 綠框為目前流程建議的下一步
            </div>
          )}
        </Sec>
      )}

      {/* ④ 樣式參考 */}
      {ref && (
        <Sec title={`📄 ${ref.label}（參考）`} accent={C.purple}>
          <div style={{ fontSize: 12, color: C.ivory, lineHeight: 1.8, whiteSpace: "pre-wrap",
            background: C.mid, borderRadius: 8, padding: "10px 12px" }}>
            {ref.text}
          </div>
        </Sec>
      )}

      {/* ⑤ 師傅 + 期限 */}
      {dtype && (
        <Sec title="👨‍🏭 指派師傅 / 期限">
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {dtype.tailors.map(t => (
              <button key={t} onClick={() => setTailor(t)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "9px 18px",
                border: `1px solid ${tailor === t ? C.gold : C.border}`,
                background: tailor === t ? C.gold + "22" : C.mid,
                color: tailor === t ? C.gold : C.sage,
              }}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 5 }}>製作完成期限</div>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "9px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
        </Sec>
      )}

      {/* ⑥ 成品製作項目（修改） */}
      {isAlter && (
        <Sec title="✂️ 成品製作項目">
          <AlterBlock items={alterItems} checked={alterChecked} onToggle={toggleAlter}
            extraNote={alterNote} onNote={setAlterNote} />
          {alterChecked.length > 0 && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: C.mid, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>已勾選</div>
              <div style={{ fontSize: 13, color: C.gold }}>{alterChecked.join("、")}</div>
            </div>
          )}
        </Sec>
      )}

      {/* ⑦ 結果提示 */}
      {result && (
        <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10,
          background: (result.ok ? C.green : C.red) + "22",
          border: `1px solid ${(result.ok ? C.green : C.red)}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: result.ok ? C.green : C.red }}>
            {result.ok ? "✅ " : "❌ "}{result.msg}
          </div>
          {result.flow && (
            <div style={{ fontSize: 11, color: C.sage, marginTop: 4 }}>
              訂單流程已更新為 <span style={{ color: C.gold, fontWeight: 600 }}>{result.flow}</span>
            </div>
          )}
          {result.url && (
            <a href={result.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: C.gold, display: "block", marginTop: 6 }}>
              → 開啟派工單（傳給師傅）
            </a>
          )}
        </div>
      )}

      {/* ⑧ 送出按鈕 + 流程預告 */}
      {dtype && tailor && (
        <div>
          {flowPreview && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.sage, marginBottom: 8 }}>
              建立後訂單流程將更新為
              <span style={{ color: C.gold, marginLeft: 4, fontWeight: 600 }}>{flowPreview}</span>
            </div>
          )}
          <button onClick={submit} disabled={submitting} style={{
            width: "100%", padding: "15px", borderRadius: 12, border: "none",
            background: submitting ? C.mid : C.gold,
            color: submitting ? C.sage : C.bg,
            fontSize: 15, fontWeight: 700, cursor: submitting ? "default" : "pointer",
          }}>{submitting ? "建立中..." : "✦ 建立派工單"}</button>
        </div>
      )}
    </div>
  );
}
