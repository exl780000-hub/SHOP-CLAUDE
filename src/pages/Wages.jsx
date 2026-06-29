import { useState, useEffect } from "react";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  green: "#5E9E6E", red: "#E05252", mid: "#2A3A50", blue: "#4A7AB5",
};

const TAILORS = ["全部", "外套師傅", "褲子師傅", "經理"];

function monthStr(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}

function WageRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.border}44` }}>
      <div style={{ width: 80, fontSize: 12, color: C.sage, flexShrink: 0 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
        <span style={{ fontSize: 11, color: C.border }}>$</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: "5px 8px", color: C.ivory, fontSize: 14, fontWeight: 700,
            outline: "none", fontFamily: "Georgia,serif", textAlign: "right" }} />
      </div>
    </div>
  );
}

function OrderWage({ order, onSaved }) {
  const [j, setJ] = useState(String(order.jacketWage || 0));
  const [t, setT] = useState(String(order.trouserWage || 0));
  const [m, setM] = useState(String(order.managerFee || 0));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const total = (Number(j) || 0) + (Number(t) || 0) + (Number(m) || 0);
  const origTotal = (order.jacketWage || 0) + (order.trouserWage || 0) + (order.managerFee || 0);
  const dirty = j !== String(order.jacketWage || 0) || t !== String(order.trouserWage || 0) || m !== String(order.managerFee || 0);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          jacketWage: Number(j) || 0,
          trouserWage: Number(t) || 0,
          managerFee: Number(m) || 0,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      onSaved(order.id, { jacketWage: Number(j), trouserWage: Number(t), managerFee: Number(m), totalWage: total });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("儲存失敗：" + e.message);
    }
    setSaving(false);
  };

  const hasJacket = order.items?.includes("外套") || order.items?.includes("二件式") || order.items?.includes("三件式");
  const hasTrouser = order.items?.includes("褲子") || order.items?.includes("二件式") || order.items?.includes("三件式");

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.name}</div>
          <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{order.items} · {order.date}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${total.toLocaleString()}</div>
          {dirty && <div style={{ fontSize: 10, color: C.gold }}>未儲存</div>}
          {saved  && <div style={{ fontSize: 10, color: C.green }}>✅ 已儲存</div>}
        </div>
      </div>

      <div style={{ padding: "8px 14px" }}>
        {(hasJacket || Number(j) > 0) && <WageRow label="外套師傅" value={j} onChange={setJ} />}
        {(hasTrouser || Number(t) > 0) && <WageRow label="褲子師傅" value={t} onChange={setT} />}
        <WageRow label="經理費" value={m} onChange={setM} />

        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: C.sage }}>
            合計
            {origTotal !== total && origTotal > 0 && (
              <span style={{ marginLeft: 6, color: total > origTotal ? C.green : C.red, fontSize: 11 }}>
                ({total > origTotal ? "+" : ""}{(total - origTotal).toLocaleString()})
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${total.toLocaleString()}</span>
            {dirty && (
              <button onClick={save} disabled={saving} style={{
                background: saving ? C.mid : C.green, color: saving ? C.sage : "#fff",
                border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12,
                fontWeight: 700, cursor: saving ? "default" : "pointer",
              }}>{saving ? "儲存中" : "儲存"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Wages() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 時間篩選
  const [timeMode, setTimeMode] = useState("month"); // "month" | "custom"
  const [selectedMonth, setSelectedMonth] = useState(monthStr(0));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // 師傅篩選
  const [tailor, setTailor] = useState("全部");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/orders?q=");
      const d = await r.json();
      setOrders(d.orders || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (orderId, updated) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
  };

  // 時間過濾
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    if (timeMode === "month") {
      return dateStr.startsWith(selectedMonth);
    }
    if (timeMode === "custom") {
      if (!customStart && !customEnd) return true;
      if (customStart && dateStr < customStart) return false;
      if (customEnd && dateStr > customEnd) return false;
      return true;
    }
    return true;
  };

  // 師傅過濾
  const matchesTailor = (o) => {
    if (tailor === "全部") return true;
    if (tailor === "外套師傅") {
      return (o.jacketWage || 0) > 0 ||
        o.items?.includes("外套") || o.items?.includes("二件式") || o.items?.includes("三件式");
    }
    if (tailor === "褲子師傅") {
      return (o.trouserWage || 0) > 0 ||
        o.items?.includes("褲子") || o.items?.includes("二件式") || o.items?.includes("三件式");
    }
    if (tailor === "經理") return true; // 每筆都有經理費
    return true;
  };

  const filtered = orders.filter(o => inRange(o.date) && matchesTailor(o));

  // 依師傅算合計
  const sumJacket  = filtered.reduce((s, o) => s + (o.jacketWage  || 0), 0);
  const sumTrouser = filtered.reduce((s, o) => s + (o.trouserWage || 0), 0);
  const sumManager = filtered.reduce((s, o) => s + (o.managerFee  || 0), 0);
  const sumTotal   = filtered.reduce((s, o) => s + (o.totalWage   || 0), 0);

  const quickMonths = [
    { label: "上上月", val: monthStr(-2) },
    { label: "上月",   val: monthStr(-1) },
    { label: "本月",   val: monthStr(0)  },
  ];

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* ── 時間篩選 ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 10 }}>📅 時間篩選</div>

        {/* 快速月份 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {quickMonths.map(({ label, val }) => {
            const active = timeMode === "month" && selectedMonth === val;
            return (
              <button key={val} onClick={() => { setTimeMode("month"); setSelectedMonth(val); }} style={{
                flex: 1, cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 0",
                border: `1px solid ${active ? C.gold : C.border}`,
                background: active ? C.gold + "22" : C.mid,
                color: active ? C.gold : C.sage,
              }}>{label}<div style={{ fontSize: 10, marginTop: 2, color: active ? C.gold + "aa" : C.border }}>{val}</div></button>
            );
          })}
          <button onClick={() => setTimeMode("custom")} style={{
            flex: 1, cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 0",
            border: `1px solid ${timeMode === "custom" ? C.blue : C.border}`,
            background: timeMode === "custom" ? C.blue + "22" : C.mid,
            color: timeMode === "custom" ? C.blue : C.sage,
          }}>自訂</button>
        </div>

        {/* 月份選擇器（點月份模式） */}
        {timeMode === "month" && (
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "8px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
        )}

        {/* 自訂日期區間 */}
        {timeMode === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "8px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
            <span style={{ color: C.sage, fontSize: 12, flexShrink: 0 }}>～</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "8px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
          </div>
        )}
      </div>

      {/* ── 師傅篩選 ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {TAILORS.map(t => (
          <button key={t} onClick={() => setTailor(t)} style={{
            cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "8px 14px",
            border: `1px solid ${tailor === t ? C.gold : C.border}`,
            background: tailor === t ? C.gold + "22" : "transparent",
            color: tailor === t ? C.gold : C.sage,
          }}>{t}</button>
        ))}
      </div>

      {/* ── 工資合計摘要 ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 10 }}>
          💰 工資合計
          <span style={{ marginLeft: 8, fontSize: 10, color: C.sage, fontWeight: 400 }}>
            {filtered.length} 筆訂單
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {[
            { label: "外套師傅", val: sumJacket,  show: tailor === "全部" || tailor === "外套師傅" },
            { label: "褲子師傅", val: sumTrouser, show: tailor === "全部" || tailor === "褲子師傅" },
            { label: "經理費",   val: sumManager, show: tailor === "全部" || tailor === "經理" },
            { label: "合計",     val: sumTotal,   show: tailor === "全部", highlight: true },
          ].filter(x => x.show).map(({ label, val, highlight }) => (
            <div key={label} style={{
              background: C.mid, borderRadius: 8, padding: "10px 12px",
              border: highlight ? `1px solid ${C.gold}44` : "none",
            }}>
              <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? C.gold : C.ivory, fontFamily: "Georgia,serif" }}>
                ${val.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 訂單列表 ── */}
      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ color: C.sage, textAlign: "center", padding: 40, fontSize: 14 }}>此區間無訂單</div>
      )}

      {filtered.map(o => (
        <OrderWage key={o.id} order={o} onSaved={handleSaved} />
      ))}
    </div>
  );
}
