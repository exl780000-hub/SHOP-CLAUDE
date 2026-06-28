import { useState, useEffect } from "react";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  green: "#5E9E6E", red: "#E05252", mid: "#2A3A50",
};

export default function DispatchTracking() {
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [returnDate, setReturnDate] = useState("");
  const [wage, setWage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, oRes] = await Promise.all([
        fetch("/api/dispatches").then(r => r.json()),
        fetch("/api/orders").then(r => r.json()),
      ]);
      setDispatches(dRes.dispatches || []);
      setOrders(oRes.orders || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const orderName = (id) => {
    const o = orders.find(x => x.id === id);
    return o ? o.name : "（訂單）";
  };

  // group dispatches by order
  const byOrder = {};
  dispatches.forEach(d => {
    const oid = (d.orderRel && d.orderRel[0]) || "other";
    if (!byOrder[oid]) byOrder[oid] = [];
    byOrder[oid].push(d);
  });

  const markDone = async (d) => {
    const month = new Date().toISOString().slice(0, 7);
    await fetch("/api/update-dispatch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispatchId: d.id, status: "✅ 完成",
        returnDate: returnDate || undefined,
        wage: wage || undefined,
        wageConfirmed: wage ? true : undefined,
        month,
      }),
    });
    setEditing(null); setReturnDate(""); setWage("");
    load();
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>📊 派工追蹤</div>
        <button onClick={load} style={{ background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.sage, fontSize: 12, cursor: "pointer" }}>🔄 重整</button>
      </div>

      {loading && <div style={{ color: C.sage }}>載入中...</div>}

      {!loading && Object.keys(byOrder).length === 0 && (
        <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>尚無派工記錄</div>
      )}

      {Object.entries(byOrder).map(([oid, list]) => (
        <div key={oid} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            {orderName(oid)}
          </div>
          {list.map(d => (
            <div key={d.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.type}</div>
                  <div style={{ fontSize: 11, color: C.sage }}>{d.tailor} · 期限 {d.deadline || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.status === "✅ 完成" ? C.green : C.gold }}>{d.status}</span>
                  {d.status !== "✅ 完成" && (
                    <button onClick={() => setEditing(editing === d.id ? null : d.id)} style={{
                      display: "block", marginTop: 4, background: C.gold + "22", border: `1px solid ${C.gold}44`,
                      borderRadius: 6, padding: "4px 10px", color: C.gold, fontSize: 11, cursor: "pointer",
                    }}>標記完成</button>
                  )}
                  {d.status === "✅ 完成" && d.returnDate && (
                    <div style={{ fontSize: 10, color: C.sage, marginTop: 2 }}>送回 {d.returnDate}</div>
                  )}
                </div>
              </div>
              {editing === d.id && (
                <div style={{ marginTop: 8, padding: 10, background: C.mid, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>送回日期</div>
                  <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.ivory, fontSize: 13, marginBottom: 8, outline: "none" }} />
                  <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>工資金額（選填）</div>
                  <input type="number" value={wage} onChange={e => setWage(e.target.value)} placeholder="工資"
                    style={{ width: "100%", boxSizing: "border-box", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.ivory, fontSize: 13, marginBottom: 8, outline: "none" }} />
                  <button onClick={() => markDone(d)} style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontWeight: 700, cursor: "pointer" }}>確認完成</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
