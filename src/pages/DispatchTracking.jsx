import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  green: "#5E9E6E", red: "#E05252", mid: "#2A3A50", blue: "#4A7AB5",
  purple: "#8A6ABF",
};

const TODAY = new Date().toISOString().slice(0, 10);

// 流程 → 預期要建的派工單類型
const FLOW_NEEDED = {
  "📐 打版":    ["📐 打版單"],
  "🪡 製作毛胚": ["🧵 毛胚製作單"],
  "✂️ 開始製作": ["👔 外套製作單", "👖 褲子製作單"],
  "🧍 第二試身": ["✂️ 外套修改單", "✂️ 褲子修改單"],
};

const FLOW_COLOR = {
  "📐 打版":    C.blue,
  "🪡 製作毛胚": C.purple,
  "✂️ 開始製作": C.gold,
  "🧍 第二試身": "#E09E4C",
  "🪢 最後縫製": C.sage,
  "🎉 完成訂單": C.green,
};

function Tag({ color, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      background: color + "28", color, border: `1px solid ${color}55`,
    }}>{children}</span>
  );
}

function isOverdue(deadline) {
  return deadline && deadline < TODAY;
}

export default function DispatchTracking() {
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("待派工");
  const [editing, setEditing]       = useState(null); // dispatchId
  const [returnDate, setReturnDate] = useState("");
  const [wage, setWage]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

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

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // 建立索引
  const orderById = Object.fromEntries(orders.map(o => [o.id, o]));
  const dispsByOrder = {};
  dispatches.forEach(d => {
    const oid = d.orderRel?.[0];
    if (oid) { if (!dispsByOrder[oid]) dispsByOrder[oid] = []; dispsByOrder[oid].push(d); }
  });

  // ── 待派工：流程在 FLOW_NEEDED 且對應派工單未全部建立 ──
  const needsDispatch = orders.filter(o => {
    const needed = FLOW_NEEDED[o.flow];
    if (!needed) return false;
    const existing = dispsByOrder[o.id] || [];
    // 只要有任何一種 needed type 的待完成/已完成派工都算已派工
    const covered = needed.some(t => existing.some(d => d.type === t));
    return !covered;
  });

  // ── 待完成 ──
  const pending = dispatches.filter(d => d.status === "⏳ 待完成");

  // ── 已完成 ──
  const done = dispatches.filter(d => d.status === "✅ 完成");

  const overdueCount = pending.filter(d => isOverdue(d.deadline)).length;

  // 待完成按訂單分組
  const pendingByOrder = {};
  pending.forEach(d => {
    const oid = d.orderRel?.[0] || "other";
    if (!pendingByOrder[oid]) pendingByOrder[oid] = [];
    pendingByOrder[oid].push(d);
  });

  const markDone = async (d) => {
    setSaving(true);
    const month = new Date().toISOString().slice(0, 7);
    const orderId = d.orderRel?.[0];
    try {
      const r = await fetch("/api/update-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId: d.id, status: "✅ 完成",
          returnDate: returnDate || undefined,
          wage: wage || undefined,
          wageConfirmed: wage ? true : undefined,
          month, orderId, dispatchType: d.type,
        }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      showToast(data.flowAdvanced
        ? `✅ 完成！流程推進→「${data.flowAdvanced}」`
        : "✅ 標記完成");
      setEditing(null); setReturnDate(""); setWage("");
      load();
    } catch (e) { showToast("更新失敗：" + e.message, false); }
    setSaving(false);
  };

  const TABS = [
    { key: "待派工", label: "待派工", count: needsDispatch.length, color: C.blue },
    { key: "待完成", label: "待完成", count: pending.length,        color: C.gold,  badge: overdueCount },
    { key: "已完成", label: "已完成", count: done.length,           color: C.green },
  ];

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, cursor: "pointer", borderRadius: 10, padding: "10px 4px",
            border: `1px solid ${tab === t.key ? t.color : C.border}`,
            background: tab === t.key ? t.color + "22" : C.card,
            position: "relative",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: tab === t.key ? t.color : C.ivory,
              fontFamily: "Georgia,serif" }}>{t.count}</div>
            <div style={{ fontSize: 11, color: tab === t.key ? t.color : C.sage, marginTop: 1 }}>{t.label}</div>
            {t.badge > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 6,
                background: C.red, color: "#fff", borderRadius: 10,
                fontSize: 9, fontWeight: 700, padding: "1px 5px",
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={load} style={{
          background: "transparent", border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "5px 12px", color: C.sage, fontSize: 11, cursor: "pointer",
        }}>🔄 重整</button>
      </div>

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>載入中...</div>}

      {/* ───── 待派工 ───── */}
      {!loading && tab === "待派工" && (
        <>
          {needsDispatch.length === 0 && (
            <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>🎉 所有訂單都已派工</div>
          )}
          {needsDispatch.map(o => {
            const needed = FLOW_NEEDED[o.flow] || [];
            const fc = FLOW_COLOR[o.flow] || C.sage;
            return (
              <div key={o.id} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, marginBottom: 8, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ivory, marginBottom: 5,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.name}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      <Tag color={fc}>{o.flow}</Tag>
                      {o.items && <Tag color={C.sage}>{o.items}</Tag>}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: 10, color: C.sage }}>需建立：</span>
                      {needed.map(t => (
                        <span key={t} style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 8,
                          background: C.gold + "22", color: C.gold, border: `1px solid ${C.gold}44`,
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => navigate("/dispatch")} style={{
                    flexShrink: 0, background: C.gold, color: C.bg, border: "none",
                    borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}>去派工 ↗</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ───── 待完成 ───── */}
      {!loading && tab === "待完成" && (
        <>
          {overdueCount > 0 && (
            <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 10,
              background: C.red + "18", border: `1px solid ${C.red}44`,
              fontSize: 12, color: C.red, fontWeight: 700 }}>
              ⚠️ {overdueCount} 筆已逾期
            </div>
          )}
          {Object.keys(pendingByOrder).length === 0 && (
            <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>🎉 無待完成派工單</div>
          )}
          {Object.entries(pendingByOrder).map(([oid, list]) => {
            const order = orderById[oid];
            const fc = order ? (FLOW_COLOR[order.flow] || C.sage) : C.sage;
            return (
              <div key={oid} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, marginBottom: 10, overflow: "hidden",
              }}>
                {/* 訂單標題 */}
                <div style={{
                  padding: "9px 14px", borderBottom: `1px solid ${C.border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.mid + "88",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order?.name || "（訂單）"}
                  </div>
                  {order?.flow && <Tag color={fc}>{order.flow}</Tag>}
                </div>

                {/* 派工單 rows */}
                {list.map(d => {
                  const overdue   = isOverdue(d.deadline);
                  const isEditing = editing === d.id;
                  return (
                    <div key={d.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                      <div style={{
                        padding: "10px 14px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{d.type}</span>
                            <span style={{ fontSize: 11, color: C.sage }}>{d.tailor}</span>
                            {d.deadline && (
                              <span style={{ fontSize: 10, color: overdue ? C.red : C.border }}>
                                {overdue ? "⚠️ 逾期 " : "期限 "}{d.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => {
                          setEditing(isEditing ? null : d.id);
                          setReturnDate(""); setWage("");
                        }} style={{
                          flexShrink: 0, background: isEditing ? C.mid : C.gold + "22",
                          border: `1px solid ${isEditing ? C.border : C.gold + "66"}`,
                          borderRadius: 7, padding: "5px 12px",
                          color: isEditing ? C.sage : C.gold, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        }}>{isEditing ? "取消" : "完成"}</button>
                      </div>

                      {/* inline 完成表單 */}
                      {isEditing && (
                        <div style={{ padding: "0 14px 12px" }}>
                          <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>送回日期</div>
                                <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                                  style={{ width: "100%", boxSizing: "border-box", background: C.card,
                                    border: `1px solid ${C.border}`, borderRadius: 6,
                                    padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>工資（選填）</div>
                                <input type="number" value={wage} onChange={e => setWage(e.target.value)}
                                  placeholder="金額"
                                  style={{ width: "100%", boxSizing: "border-box", background: C.card,
                                    border: `1px solid ${C.border}`, borderRadius: 6,
                                    padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
                              </div>
                            </div>
                            <button onClick={() => markDone(d)} disabled={saving} style={{
                              width: "100%", background: saving ? C.mid : C.green,
                              color: saving ? C.sage : "#fff", border: "none",
                              borderRadius: 6, padding: "9px", fontWeight: 700,
                              cursor: saving ? "default" : "pointer", fontSize: 13,
                            }}>{saving ? "儲存中..." : "✅ 確認完成"}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}

      {/* ───── 已完成 ───── */}
      {!loading && tab === "已完成" && (
        <>
          {done.length === 0 && (
            <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>尚無已完成派工單</div>
          )}
          {done.map(d => {
            const oid   = d.orderRel?.[0];
            const order = orderById[oid];
            return (
              <div key={d.id} style={{
                background: C.card, border: `1px solid ${C.border}33`,
                borderRadius: 10, marginBottom: 6,
                padding: "10px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.ivory, marginBottom: 3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order?.name || "（訂單）"}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: C.sage }}>{d.type}</span>
                    <span style={{ fontSize: 11, color: C.border }}>{d.tailor}</span>
                    {d.returnDate && <span style={{ fontSize: 10, color: C.border }}>送回 {d.returnDate}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {d.wage ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                      ${Number(d.wage).toLocaleString()}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>✅ 完成</div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? C.green : C.red, color: "#fff",
          padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 999,
          maxWidth: 320, textAlign: "center", whiteSpace: "pre-wrap",
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
