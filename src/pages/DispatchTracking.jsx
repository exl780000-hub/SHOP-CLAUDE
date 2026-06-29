import { useState, useEffect } from "react";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  green: "#5E9E6E", red: "#E05252", mid: "#2A3A50", blue: "#4A7AB5",
};

const TODAY = new Date().toISOString().slice(0, 10);

function isOverdue(deadline) {
  return deadline && deadline < TODAY;
}

export default function DispatchTracking() {
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("待完成");
  const [editing, setEditing] = useState(null);
  const [returnDate, setReturnDate] = useState("");
  const [wage, setWage] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

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

  const showToast = (msg, ok = true, duration = 3000) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), duration);
  };

  const orderById = Object.fromEntries(orders.map(o => [o.id, o]));
  const orderName = (id) => orderById[id]?.name || "（訂單）";

  const markDone = async (d) => {
    setSaving(true);
    const month = new Date().toISOString().slice(0, 7);
    const orderId = d.orderRel?.[0];
    try {
      const r = await fetch("/api/update-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId: d.id,
          status: "✅ 完成",
          returnDate: returnDate || undefined,
          wage: wage || undefined,
          wageConfirmed: wage ? true : undefined,
          month,
          orderId,
          dispatchType: d.type,
        }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      if (data.flowAdvanced) {
        showToast(`✅ 完成！訂單流程已自動推進至「${data.flowAdvanced}」`, true, 4000);
      } else {
        showToast("標記完成");
      }
      setEditing(null); setReturnDate(""); setWage("");
      load();
    } catch (e) {
      showToast("更新失敗：" + e.message, false);
    }
    setSaving(false);
  };

  // 篩選
  const filtered = dispatches.filter(d => {
    if (filter === "待完成") return d.status !== "✅ 完成";
    if (filter === "✅ 完成") return d.status === "✅ 完成";
    return true;
  });

  // 依訂單分組
  const byOrder = {};
  filtered.forEach(d => {
    const oid = d.orderRel?.[0] || "other";
    if (!byOrder[oid]) byOrder[oid] = [];
    byOrder[oid].push(d);
  });

  const pendingCount = dispatches.filter(d => d.status !== "✅ 完成").length;
  const overdueCount = dispatches.filter(d => d.status !== "✅ 完成" && isOverdue(d.deadline)).length;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* 統計列 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { key: "待完成", label: "待完成", count: pendingCount, color: C.gold },
          { key: "✅ 完成", label: "已完成", count: dispatches.filter(d => d.status === "✅ 完成").length, color: C.green },
          { key: "全部", label: "全部", count: dispatches.length, color: C.sage },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            flex: 1, cursor: "pointer", borderRadius: 10, padding: "10px 6px",
            border: `1px solid ${filter === f.key ? f.color : C.border}`,
            background: filter === f.key ? f.color + "22" : C.card,
            color: filter === f.key ? f.color : C.sage,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Georgia,serif" }}>{f.count}</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>{f.label}</div>
          </button>
        ))}
      </div>

      {/* 逾期警示 */}
      {overdueCount > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: C.red + "18", border: `1px solid ${C.red}44`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>有 {overdueCount} 筆派工單已逾期</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={load} style={{ background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.sage, fontSize: 12, cursor: "pointer" }}>🔄 重整</button>
      </div>

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}

      {!loading && Object.keys(byOrder).length === 0 && (
        <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>
          {filter === "待完成" ? "🎉 無待完成派工單" : "尚無派工記錄"}
        </div>
      )}

      {Object.entries(byOrder).map(([oid, list]) => {
        const order = orderById[oid];
        const doneCount = list.filter(d => d.status === "✅ 完成").length;
        return (
          <div key={oid} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
            {/* 訂單標題 */}
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {orderName(oid)}
              </div>
              <div style={{ fontSize: 11, color: C.sage, flexShrink: 0, marginLeft: 8 }}>
                {doneCount}/{list.length} 完成
              </div>
            </div>

            {/* 派工單列表 */}
            {list.map(d => {
              const overdue = isOverdue(d.deadline);
              const isEditing = editing === d.id;
              return (
                <div key={d.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}44` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{d.type}</div>
                      <div style={{ fontSize: 11, color: C.sage }}>
                        {d.tailor}
                        {d.deadline && (
                          <span style={{ marginLeft: 6, color: overdue ? C.red : C.sage }}>
                            {overdue ? "⚠️ 逾期 " : "期限 "}{d.deadline}
                          </span>
                        )}
                      </div>
                      {d.status === "✅ 完成" && d.wage ? (
                        <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>工資 ${Number(d.wage).toLocaleString()}</div>
                      ) : null}
                      {d.status === "✅ 完成" && d.returnDate ? (
                        <div style={{ fontSize: 10, color: C.sage, marginTop: 1 }}>送回 {d.returnDate}</div>
                      ) : null}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: d.status === "✅ 完成" ? C.green : overdue ? C.red : C.gold, marginBottom: 4 }}>
                        {d.status}
                      </div>
                      {d.status !== "✅ 完成" && (
                        <button onClick={() => { setEditing(isEditing ? null : d.id); setReturnDate(""); setWage(""); }} style={{
                          background: C.gold + "22", border: `1px solid ${C.gold}44`,
                          borderRadius: 6, padding: "4px 10px", color: C.gold, fontSize: 11, cursor: "pointer",
                        }}>標記完成</button>
                      )}
                    </div>
                  </div>

                  {/* 完成表單 */}
                  {isEditing && (
                    <div style={{ marginTop: 10, padding: "12px", background: C.mid, borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>送回日期</div>
                          <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                            style={{ width: "100%", boxSizing: "border-box", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>工資（選填）</div>
                          <input type="number" value={wage} onChange={e => setWage(e.target.value)} placeholder="金額"
                            style={{ width: "100%", boxSizing: "border-box", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
                        </div>
                      </div>
                      <button onClick={() => markDone(d)} disabled={saving} style={{
                        width: "100%", background: saving ? C.mid : C.green, color: saving ? C.sage : "#fff",
                        border: "none", borderRadius: 6, padding: "9px", fontWeight: 700, cursor: saving ? "default" : "pointer", fontSize: 13,
                      }}>{saving ? "儲存中..." : "✅ 確認完成"}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? C.green : C.red, color: "#fff",
          padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 999, maxWidth: 320, textAlign: "center",
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
