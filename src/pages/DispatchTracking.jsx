import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

const TODAY = new Date().toISOString().slice(0, 10);

// 流程 + 品項 → 這筆訂單實際需要的派工單（逐張檢查，部分派工也會顯示缺單）
function neededTypes(order) {
  const items = order.items || "";
  const hasJacket  = items.includes("二件式") || items.includes("三件式") || items.includes("外套");
  const hasTrouser = items.includes("二件式") || items.includes("三件式") || items.includes("褲子");
  const hasVest    = items.includes("三件式") || items.includes("背心");
  switch (order.flow) {
    case "📐 打版":     return ["📐 打版單"];
    case "🪡 製作毛胚": return ["🧵 毛胚製作單"];
    case "✂️ 開始製作": return [
      ...(hasJacket  ? ["👔 外套製作單"] : []),
      ...(hasTrouser ? ["👖 褲子製作單"] : []),
      ...(hasVest    ? ["🦺 背心製作單"] : []),
    ];
    case "🧍 第二試身": return [
      ...(hasJacket  ? ["✂️ 外套修改單"] : []),
      ...(hasTrouser ? ["✂️ 褲子修改單"] : []),
    ];
    default: return [];
  }
}

// 各派工單類型的可指派師傅（第一個為預設）
const TYPE_TAILORS = {
  "📐 打版單":    ["經理"],
  "🧵 毛胚製作單": ["駐店師傅", "經理"],
  "👔 外套製作單": ["外套師傅"],
  "👖 褲子製作單": ["褲子師傅"],
  "🦺 背心製作單": ["外套師傅", "褲子師傅"],
  "✂️ 外套修改單": ["外套師傅"],
  "✂️ 褲子修改單": ["駐店師傅"],
};

const ALTER_ITEMS = {
  "✂️ 外套修改單": ["肩領", "袖子", "腰身", "袖長單手", "袖長雙手"],
  "✂️ 褲子修改單": ["腰身", "褲長", "褲腳", "褲管", "臀圍"],
};

// 依派工單類型組出內容文字（帶入訂單樣式）
function buildDispatchContent(order, type, alterChecked = [], alterNote = "") {
  if (type === "👔 外套製作單") return `外套樣式\n${order.jacketStyle || "—"}`;
  if (type === "👖 褲子製作單") return `褲子樣式\n${order.trouserStyle || "—"}`;
  if (type === "🦺 背心製作單") return `背心樣式\n${order.vestStyle || "—"}`;
  if (type === "🧵 毛胚製作單") return `【樣式明細】\n外套：${order.jacketStyle || "—"}\n褲子：${order.trouserStyle || "—"}\n背心：${order.vestStyle || "—"}`;
  if (type === "📐 打版單")    return `【完整製作資訊】\n外套：${order.jacketStyle || "—"}\n褲子：${order.trouserStyle || "—"}\n背心：${order.vestStyle || "—"}\n（量身尺寸請見訂單關聯量身記錄）`;
  if (ALTER_ITEMS[type]) {
    const lines = alterChecked.length > 0 ? alterChecked.map(k => `• ${k}`).join("\n") : "（未勾選項目）";
    return `成品製作項目：\n${lines}${alterNote ? `\n特殊：${alterNote}` : ""}`;
  }
  return "";
}

const FLOW_COLOR = {
  "📐 打版":    "#4A7AB5",
  "🪡 製作毛胚": "#8A6ABF",
  "✂️ 開始製作": "#C9A84C",
  "🧍 第二試身": "#E09E4C",
  "🪢 最後縫製": "#7A9E8A",
  "🎉 完成訂單": "#5E9E6E",
};

function Tag({ color, children }) {
  const C = useTheme();
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

function daysSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr + "T00:00:00").getTime();
  return Math.floor(ms / 86400000);
}

export default function DispatchTracking() {
  const C = useTheme();
  const isWide = useIsWide();
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("待派工");
  const [editing, setEditing]       = useState(null); // dispatchId
  const [returnDate, setReturnDate] = useState("");
  const [wage, setWage]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [doneMonth, setDoneMonth]   = useState(TODAY.slice(0, 7));
  // 快速建單狀態
  const [quickCreate, setQuickCreate] = useState(null); // { orderId, type }
  const [qcTailor, setQcTailor]       = useState("");
  const [qcDeadline, setQcDeadline]   = useState("");
  const [qcChecked, setQcChecked]     = useState([]);
  const [qcNote, setQcNote]           = useState("");
  const [qcSaving, setQcSaving]       = useState(false);
  // 改期限狀態
  const [editDeadline, setEditDeadline] = useState(null); // dispatchId
  const [newDeadline, setNewDeadline]   = useState("");

  const openQuickCreate = (orderId, type) => {
    setQuickCreate({ orderId, type });
    setQcTailor((TYPE_TAILORS[type] || [])[0] || "");
    setQcDeadline(""); setQcChecked([]); setQcNote("");
  };

  const submitQuickCreate = async (order) => {
    if (!quickCreate || !qcTailor) return;
    setQcSaving(true);
    try {
      const content = buildDispatchContent(order, quickCreate.type, qcChecked, qcNote);
      const r = await fetch("/api/create-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id, orderName: order.name,
          dispatchType: quickCreate.type, tailor: qcTailor,
          deadline: qcDeadline || undefined, content,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      showToast(`✅ ${quickCreate.type} 已建立`);
      setQuickCreate(null);
      load();
    } catch (e) { showToast("建立失敗：" + e.message, false); }
    setQcSaving(false);
  };

  const saveDeadline = async (dispatchId) => {
    if (!newDeadline) return;
    setSaving(true);
    try {
      const r = await fetch("/api/update-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId, deadline: newDeadline }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      showToast("期限已更新");
      setEditDeadline(null); setNewDeadline("");
      load();
    } catch (e) { showToast("更新失敗：" + e.message, false); }
    setSaving(false);
  };

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

  // ── 待派工：逐張比對，缺任何一張就列出（部分派工也會提醒）──
  const needsDispatch = orders
    .map(o => {
      const needed = neededTypes(o);
      if (needed.length === 0) return null;
      const existing = dispsByOrder[o.id] || [];
      const missing = needed.filter(t => !existing.some(d => d.type === t && d.status !== "❌ 取消"));
      return missing.length > 0 ? { order: o, missing } : null;
    })
    .filter(Boolean);

  // ── 待完成：逾期在前，其餘依期限近→遠 ──
  const pending = dispatches.filter(d => d.status === "⏳ 待完成").sort((a, b) => {
    const ao = isOverdue(a.deadline) ? 0 : 1, bo = isOverdue(b.deadline) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return (a.deadline || "9999").localeCompare(b.deadline || "9999");
  });

  // ── 已完成 ──
  const done = dispatches.filter(d => d.status === "✅ 完成");
  const doneInMonth = done.filter(d => ((d.returnDate || d.month || "")).startsWith(doneMonth));

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
    <div style={{ maxWidth: isWide?900:520, margin: "0 auto", padding: "14px 14px 80px" }}>

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
          {needsDispatch.map(({ order: o, missing }) => {
            const fc = FLOW_COLOR[o.flow] || C.sage;
            const stuck = daysSince(o.flowUpdatedAt);
            const qcOpen = quickCreate?.orderId === o.id ? quickCreate.type : null;
            return (
              <div key={o.id} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 14, marginBottom: 8, padding: "12px 14px", boxShadow: C.shadowCard,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ivory, marginBottom: 5,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.name}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  <Tag color={fc}>{o.flow}</Tag>
                  {o.items && <Tag color={C.sage}>{o.items}</Tag>}
                  {stuck != null && stuck >= 3 && <Tag color={stuck >= 5 ? C.red : C.gold}>⏱ 已卡 {stuck} 天</Tag>}
                </div>

                {/* 缺的單：點了直接在卡片內建立 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {missing.map(t => (
                    <button key={t} onClick={() => qcOpen === t ? setQuickCreate(null) : openQuickCreate(o.id, t)} style={{
                      cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 8,
                      background: qcOpen === t ? C.gold : C.gold + "22",
                      color: qcOpen === t ? C.bg : C.gold,
                      border: `1px solid ${C.gold}66`,
                    }}>＋ {t}</button>
                  ))}
                </div>

                {/* 卡內迷你建單表單 */}
                {qcOpen && (
                  <div style={{ marginTop: 10, background: C.mid, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>{qcOpen}</div>

                    <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>指派師傅</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      {(TYPE_TAILORS[qcOpen] || []).map(t => (
                        <button key={t} onClick={() => setQcTailor(t)} style={{
                          cursor: "pointer", borderRadius: 6, fontSize: 12, fontWeight: 600, padding: "6px 12px",
                          border: `1px solid ${qcTailor === t ? C.gold : C.border}`,
                          background: qcTailor === t ? C.gold + "22" : C.card,
                          color: qcTailor === t ? C.gold : C.sage,
                        }}>{t}</button>
                      ))}
                    </div>

                    {ALTER_ITEMS[qcOpen] && (
                      <>
                        <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>修改項目</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          {ALTER_ITEMS[qcOpen].map(k => {
                            const on = qcChecked.includes(k);
                            return (
                              <button key={k} onClick={() => setQcChecked(p => on ? p.filter(x => x !== k) : [...p, k])} style={{
                                cursor: "pointer", borderRadius: 6, fontSize: 12, fontWeight: 600, padding: "6px 10px",
                                border: `1px solid ${on ? C.gold : C.border}`,
                                background: on ? C.gold + "22" : C.card, color: on ? C.gold : C.sage,
                              }}>{on ? "☑ " : "☐ "}{k}</button>
                            );
                          })}
                        </div>
                        <input value={qcNote} onChange={e => setQcNote(e.target.value)} placeholder="特殊說明（選填）"
                          style={{ width: "100%", boxSizing: "border-box", background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 6, padding: "7px 10px", color: C.ivory, fontSize: 12, outline: "none", marginBottom: 10 }} />
                      </>
                    )}

                    <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>完成期限（選填）</div>
                    <input type="date" value={qcDeadline} onChange={e => setQcDeadline(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: 6, padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none", marginBottom: 10 }} />

                    <button onClick={() => submitQuickCreate(o)} disabled={qcSaving || !qcTailor} style={{
                      width: "100%", padding: "10px", borderRadius: 8, border: "none",
                      background: qcSaving ? C.border : C.gold, color: qcSaving ? C.sage : C.bg,
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}>{qcSaving ? "建立中..." : `✦ 建立${qcOpen}`}</button>
                  </div>
                )}
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
                borderRadius: 14, marginBottom: 10, overflow: "hidden", boxShadow: C.shadowCard,
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
                  const isEditingDL = editDeadline === d.id;
                  const daysLeft = d.deadline ? Math.ceil((new Date(d.deadline + "T00:00:00") - new Date(TODAY + "T00:00:00")) / 86400000) : null;
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
                            <span onClick={() => { setEditDeadline(isEditingDL ? null : d.id); setNewDeadline(d.deadline || ""); }}
                              style={{ fontSize: 10, cursor: "pointer", textDecoration: "underline dotted",
                                color: overdue ? C.red : daysLeft != null && daysLeft <= 2 ? C.gold : C.border }}>
                              {d.deadline
                                ? (overdue ? `⚠️ 逾期 ${Math.abs(daysLeft)} 天（${d.deadline}）` : `剩 ${daysLeft} 天（${d.deadline}）`)
                                : "＋設定期限"}
                            </span>
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

                      {/* 改期限 */}
                      {isEditingDL && (
                        <div style={{ padding: "0 14px 10px", display: "flex", gap: 8 }}>
                          <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                            style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                              padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
                          <button onClick={() => saveDeadline(d.id)} disabled={saving || !newDeadline} style={{
                            background: C.gold, color: C.bg, border: "none", borderRadius: 6,
                            padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}>{saving ? "…" : "更新期限"}</button>
                        </div>
                      )}

                      {/* inline 完成表單 */}
                      {isEditing && (
                        <div style={{ padding: "0 14px 12px" }}>
                          <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>送回日期</div>
                              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                                style={{ width: "100%", boxSizing: "border-box", background: C.card,
                                  border: `1px solid ${C.border}`, borderRadius: 6,
                                  padding: "7px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
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

      {/* ───── 已完成（預設本月，可切月份）───── */}
      {!loading && tab === "已完成" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <input type="month" value={doneMonth} onChange={e => setDoneMonth(e.target.value)}
              style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "8px 12px", color: C.ivory, fontSize: 13, outline: "none" }} />
            <span style={{ fontSize: 11, color: C.sage, flexShrink: 0 }}>{doneInMonth.length} 筆</span>
          </div>
          {doneInMonth.length === 0 && (
            <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>{doneMonth} 無已完成派工單</div>
          )}
          {doneInMonth.map(d => {
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
                  <div style={{ fontSize: 10, color: d.wageConfirmed ? C.green : C.gold, marginTop: 2 }}>
                    {d.wageConfirmed ? "✅ 工資已確認" : "⚠️ 工資未確認"}
                  </div>
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
