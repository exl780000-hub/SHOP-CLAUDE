import React, { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

// 與 create-order.js / create-dispatch.js / update-dispatch.js 實際寫入 Notion 的值一致
const FLOW_STEPS = [
  "📐 打版",
  "🪡 製作毛胚",
  "✂️ 開始製作",
  "🧍 第二試身",
  "🪢 最後縫製",
  "🎉 完成訂單",
];

const FLOW_COLOR_FIXED = {
  "🎉 完成訂單": "#5E9E6E",
  "🪢 最後縫製": "#E05252",
  "✂️ 開始製作": "#4A7AB5",
};

const FILTER_OPTS = ["全部", "進行中", "已完成"];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr + "T00:00:00").getTime();
  return Math.floor(ms / 86400000);
}

function StuckBadge({ days, C }) {
  if (days == null || days < 3) return null;
  const color = days >= 5 ? C.red : C.gold;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
      background: color + "22", color, border: `1px solid ${color}55`,
    }}>⏱ 已卡 {days} 天</span>
  );
}

export default function Orders() {
  const C = useTheme();
  const isWide = useIsWide();
  const [viewPref, setViewPref] = useState(() => localStorage.getItem("gony-orders-view") || null);
  const view = viewPref || (isWide ? "table" : "card"); // 寬螢幕預設表格
  const setView = (v) => { setViewPref(v); localStorage.setItem("gony-orders-view", v); };
  const flowColor = (f) => FLOW_COLOR_FIXED[f] || C.gold;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("全部");
  const [showMore, setShowMore] = useState(false);
  const [stageFilter, setStageFilter] = useState("全部");
  const [itemFilter, setItemFilter] = useState("全部");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [measurement, setMeasurement] = useState({});   // { [orderId]: { data, note } | null }
  const [loadingMeas, setLoadingMeas] = useState({});
  const [updatingFlow, setUpdatingFlow] = useState(null);
  const [collectingBalance, setCollectingBalance] = useState(null);
  const [collectedIds, setCollectedIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const load = async (q = "") => {
    setLoading(true);
    try {
      const r = await fetch(`/api/orders?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setOrders(d.orders || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fetchMeasurement = async (orderId) => {
    if (measurement[orderId] !== undefined) return;
    setLoadingMeas(p => ({ ...p, [orderId]: true }));
    try {
      const r = await fetch(`/api/measurement?orderId=${orderId}`);
      const d = await r.json();
      setMeasurement(p => ({ ...p, [orderId]: d.measurement || null }));
    } catch (e) {
      setMeasurement(p => ({ ...p, [orderId]: null }));
    }
    setLoadingMeas(p => ({ ...p, [orderId]: false }));
  };

  const handleExpand = (orderId) => {
    const next = expanded === orderId ? null : orderId;
    setExpanded(next);
    if (next) fetchMeasurement(next);
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const updateFlow = async (orderId, flow) => {
    setUpdatingFlow(orderId);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, flow }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, flow } : o));
      showToast("流程已更新");
    } catch (e) {
      showToast("更新失敗：" + e.message, false);
    }
    setUpdatingFlow(null);
  };

  const collectBalance = async (orderId) => {
    setCollectingBalance(orderId);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect-balance", orderId }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setCollectedIds(prev => new Set([...prev, orderId]));
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, balancePending: false } : o));
      showToast("✅ 尾款已標記為已收");
    } catch (e) {
      showToast("失敗：" + e.message, false);
    }
    setCollectingBalance(null);
  };

  const [archiving, setArchiving] = useState(null);
  const archiveOrder = async (orderId) => {
    setArchiving(orderId);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "🎉 完成取件" }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "🎉 完成取件" } : o));
      setExpanded(null);
      showToast("🎉 訂單已歸檔（完成取件）");
    } catch (e) {
      showToast("失敗：" + e.message, false);
    }
    setArchiving(null);
  };

  const itemOptions = [...new Set(orders.flatMap(o => (o.items || "").split("、").filter(Boolean)))];

  const clearMoreFilters = () => {
    setStageFilter("全部"); setItemFilter("全部"); setDateFrom(""); setDateTo("");
  };
  const moreFiltersActive = stageFilter !== "全部" || itemFilter !== "全部" || dateFrom || dateTo;

  const kw = search.trim();
  const filtered = orders.filter(o => {
    if (kw && !(o.name || "").includes(kw) && !String(o.orderNo || "").includes(kw)) return false;
    if (filter === "已完成" && o.flow !== "🎉 完成訂單") return false;
    if (filter === "進行中" && o.flow === "🎉 完成訂單") return false;
    if (stageFilter !== "全部" && o.flow !== stageFilter) return false;
    if (itemFilter !== "全部" && !(o.items || "").includes(itemFilter)) return false;
    if (dateFrom && o.date && o.date < dateFrom) return false;
    if (dateTo && o.date && o.date > dateTo) return false;
    return true;
  });

  // 分層：需要處理（完成待收尾/卡太久）→ 進行中 → 已歸檔（完成取件，收合）
  const isArchived = (o) => o.status === "🎉 完成取件";
  const isDone = (o) => o.flow === "🎉 完成訂單";
  const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "");
  const tierAction  = filtered.filter(o => !isArchived(o) && (isDone(o) || (daysSince(o.flowUpdatedAt) ?? 0) >= 5)).sort(byDateDesc);
  const tierOngoing = filtered.filter(o => !isArchived(o) && !isDone(o) && (daysSince(o.flowUpdatedAt) ?? 0) < 5).sort(byDateDesc);
  const tierArchived = filtered.filter(isArchived).sort(byDateDesc);

  // 展開詳情（卡片與表格檢視共用）
  const renderDetail = (o) => {
    const balance = (o.actualPrice || 0) - (o.deposit || 0);
    const balanceOwed = o.balancePending || (balance > 0 && !collectedIds.has(o.id) && o.balancePending !== false);
    const meas = measurement[o.id];
    const measLoading = loadingMeas[o.id];
    return (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>

                {/* 完成收尾清單：完成訂單但尚未歸檔 */}
                {isDone(o) && !isArchived(o) && (
                  <div style={{ marginBottom: 14, padding: "12px 14px", background: C.green + "12", border: `1px solid ${C.green}44`, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 8 }}>🏁 完成收尾清單</div>
                    {[
                      { ok: !balanceOwed, label: balanceOwed ? `尾款未收 $${Number(balance).toLocaleString()}（下方可收款）` : "尾款已收" },
                      { ok: o.wageUnconfirmedCount === 0, label: o.wageUnconfirmedCount > 0 ? `${o.wageUnconfirmedCount} 筆派工工資未確認（派工追蹤頁填寫）` : "師傅工資已確認" },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <span style={{ fontSize: 14 }}>{item.ok ? "✅" : "⬜"}</span>
                        <span style={{ fontSize: 12, color: item.ok ? C.sage : C.ivory, fontWeight: item.ok ? 400 : 700 }}>{item.label}</span>
                      </div>
                    ))}
                    <button onClick={() => archiveOrder(o.id)} disabled={archiving === o.id}
                      style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 8, border: "none",
                        background: archiving === o.id ? C.mid : (!balanceOwed && o.wageUnconfirmedCount === 0 ? C.green : C.mid),
                        color: archiving === o.id ? C.sage : (!balanceOwed && o.wageUnconfirmedCount === 0 ? "#fff" : C.sage),
                        fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {archiving === o.id ? "處理中..." : (!balanceOwed && o.wageUnconfirmedCount === 0 ? "🎉 客戶已取件，完成歸檔" : "🎉 仍要歸檔（尚有未完成項目）")}
                    </button>
                  </div>
                )}

                {/* 流程更新 */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>📍 流程狀態</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {FLOW_STEPS.map(step => {
                      const active = o.flow === step;
                      const isUpdating = updatingFlow === o.id;
                      return (
                        <button key={step} onClick={() => !active && updateFlow(o.id, step)}
                          disabled={isUpdating}
                          style={{
                            cursor: active || isUpdating ? "default" : "pointer",
                            borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "5px 10px",
                            border: `1px solid ${active ? flowColor(step) : C.border}`,
                            background: active ? flowColor(step) + "33" : C.mid,
                            color: active ? flowColor(step) : C.sage,
                            opacity: isUpdating ? 0.6 : 1,
                          }}>{step}</button>
                      );
                    })}
                  </div>
                </div>

                {/* 金額 */}
                {o.actualPrice ? (
                  <div style={{ marginBottom: 14, padding: "10px 12px", background: C.mid, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>💰 金額</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: balance > 0 ? 10 : 0 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.sage, marginBottom: 2 }}>實際售價</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${Number(o.actualPrice).toLocaleString()}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.sage, marginBottom: 2 }}>訂金</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.ivory, fontFamily: "Georgia,serif" }}>${Number(o.deposit || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.sage, marginBottom: 2 }}>尾款</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: balance > 0 ? C.green : C.sage, fontFamily: "Georgia,serif" }}>${Number(balance).toLocaleString()}</div>
                      </div>
                    </div>
                    {balance > 0 && !collectedIds.has(o.id) && (
                      <button onClick={() => collectBalance(o.id)} disabled={collectingBalance === o.id}
                        style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none",
                          background: collectingBalance === o.id ? C.border : C.green,
                          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {collectingBalance === o.id ? "處理中..." : `💵 收尾款 $${Number(balance).toLocaleString()}`}
                      </button>
                    )}
                    {collectedIds.has(o.id) && (
                      <div style={{ textAlign: "center", fontSize: 12, color: C.green, fontWeight: 700 }}>✅ 尾款已收</div>
                    )}
                  </div>
                ) : null}

                {/* 工資估算 */}
                {o.totalWage ? (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>🧾 師傅工資</div>
                    <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px" }}>
                      <WageItem label="外套師傅" value={o.jacketWage} />
                      <WageItem label="褲子師傅" value={o.trouserWage} />
                      <WageItem label="經理+打板" value={o.managerFee} />
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.ivory }}>工資合計</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${Number(o.totalWage).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 樣式 */}
                {(o.jacketStyle || o.trouserStyle || o.vestStyle || o.shirtStyle) && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>👔 樣式</div>
                    <StyleRow label="外套" value={o.jacketStyle} />
                    <StyleRow label="褲子" value={o.trouserStyle} />
                    <StyleRow label="背心" value={o.vestStyle} />
                    <StyleRow label="襯衫" value={o.shirtStyle} />
                  </div>
                )}

                {/* 量身資料 */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>📐 量身資料</div>
                  {measLoading ? (
                    <div style={{ fontSize: 12, color: C.sage, padding: "8px 10px" }}>載入中...</div>
                  ) : meas ? (
                    <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px" }}>
                      {meas.data && (
                        <div style={{ fontSize: 12, color: C.ivory, whiteSpace: "pre-wrap", lineHeight: 1.8, fontFamily: "monospace" }}>{meas.data}</div>
                      )}
                      {meas.sizeNote && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, color: C.sage }}>量身備註：</span>
                          <span style={{ fontSize: 12, color: C.ivory }}>{meas.sizeNote}</span>
                        </div>
                      )}
                      {meas.traits && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, color: C.sage }}>體型特徵：</span>
                          <span style={{ fontSize: 12, color: C.ivory, whiteSpace: "pre-wrap" }}>{meas.traits}</span>
                        </div>
                      )}
                      {meas.note && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, color: C.sage }}>體型備註：</span>
                          <span style={{ fontSize: 12, color: C.ivory }}>{meas.note}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.border, padding: "8px 10px" }}>尚無量身記錄</div>
                  )}
                </div>

                {/* Notion 連結 */}
                <a href={o.url} target="_blank" rel="noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 8,
                    background: C.mid, border: `1px solid ${C.border}`, color: C.sage, fontSize: 12,
                    textDecoration: "none", fontWeight: 600 }}>
                  📝 在 Notion 查看完整訂單
                </a>
              </div>
    );
  };

  const StyleRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: C.sage, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: C.ivory, whiteSpace: "pre-wrap", lineHeight: 1.6,
          background: C.mid, borderRadius: 6, padding: "7px 10px" }}>{value}</div>
      </div>
    );
  };

  const WageItem = ({ label, value }) => {
    if (!value) return null;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 12, color: C.sage }}>{label}</span>
        <span style={{ fontSize: 12, color: C.ivory, fontFamily: "Georgia,serif" }}>${Number(value).toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: isWide?1100:520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* 搜尋（即時篩選） */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 輸入客戶名稱或訂單編號即時篩選"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.ivory, fontSize: 14, outline: "none" }} />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ background: "transparent", color: C.sage, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✕</button>
        )}
      </div>

      {/* 篩選 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        {FILTER_OPTS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "6px 14px",
            border: `1px solid ${filter === f ? C.gold : C.border}`,
            background: filter === f ? C.gold + "22" : "transparent",
            color: filter === f ? C.gold : C.sage,
          }}>
            {f}
            {f === "進行中" && orders.filter(o => o.flow !== "🎉 完成訂單").length > 0 && (
              <span style={{ marginLeft: 5, background: C.gold, color: C.bg, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                {orders.filter(o => o.flow !== "🎉 完成訂單").length}
              </span>
            )}
          </button>
        ))}
        <button onClick={() => setView(view === "table" ? "card" : "table")} style={{
          marginLeft: "auto", cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "6px 12px",
          border: `1px solid ${C.border}`, background: "transparent", color: C.sage,
        }}>{view === "table" ? "🗂 卡片" : "📊 表格"}</button>
        <button onClick={() => setShowMore(v => !v)} style={{
          cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "6px 12px",
          border: `1px solid ${moreFiltersActive ? C.gold : C.border}`,
          background: moreFiltersActive ? C.gold + "22" : "transparent",
          color: moreFiltersActive ? C.gold : C.sage,
        }}>🔍 進階{moreFiltersActive ? " ●" : ""}</button>
      </div>

      {/* 進階篩選 */}
      {showMore && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 6 }}>流程階段</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {["全部", ...FLOW_STEPS].map(s => (
              <button key={s} onClick={() => setStageFilter(s)} style={{
                cursor: "pointer", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "5px 10px",
                border: `1px solid ${stageFilter === s ? C.gold : C.border}`,
                background: stageFilter === s ? C.gold + "22" : C.mid,
                color: stageFilter === s ? C.gold : C.sage,
              }}>{s}</button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 6 }}>品項</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {["全部", ...itemOptions].map(it => (
              <button key={it} onClick={() => setItemFilter(it)} style={{
                cursor: "pointer", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "5px 10px",
                border: `1px solid ${itemFilter === it ? C.gold : C.border}`,
                background: itemFilter === it ? C.gold + "22" : C.mid,
                color: itemFilter === it ? C.gold : C.sage,
              }}>{it}</button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 6 }}>訂單日期區間</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: moreFiltersActive ? 12 : 0 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.ivory, fontSize: 12, outline: "none" }} />
            <span style={{ color: C.sage, fontSize: 12 }}>至</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.ivory, fontSize: 12, outline: "none" }} />
          </div>

          {moreFiltersActive && (
            <button onClick={clearMoreFilters} style={{
              width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", color: C.sage, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>清除進階篩選</button>
          )}
        </div>
      )}

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>沒有找到訂單</div>
      )}

      {[
        { key: "action",   title: `🔴 需要處理（${tierAction.length}）`,     list: tierAction,   color: C.red },
        { key: "ongoing",  title: `🚧 進行中（${tierOngoing.length}）`,      list: tierOngoing,  color: C.gold },
        { key: "archived", title: `✅ 已完成歸檔（${tierArchived.length}）`, list: tierArchived, color: C.green, slim: true },
      ].map(sec => sec.list.length === 0 ? null : (
      <div key={sec.key} style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: sec.color, marginBottom: 8, letterSpacing: "0.05em" }}>{sec.title}</div>

      {/* 表格檢視：一行一筆，方便整體掃視 */}
      {view === "table" ? (
        <div style={{ overflowX: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadowCard }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                {["客戶 / 訂單", "品項", "日期", "流程", "提醒", "售價", "尾款"].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 5 ? "right" : "left", padding: "8px 12px", fontSize: 10,
                    color: C.sage, fontWeight: 700, letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}`,
                    whiteSpace: "nowrap", position: "sticky", top: 0, background: C.card }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sec.list.map(o => {
                const isOpen = expanded === o.id;
                const fc = flowColor(o.flow);
                const balance = (o.actualPrice || 0) - (o.deposit || 0);
                const stuckDays = (!isDone(o) && !isArchived(o)) ? daysSince(o.flowUpdatedAt) : null;
                const balanceOwed = o.balancePending || (balance > 0 && !collectedIds.has(o.id) && o.balancePending !== false);
                const tdBase = { padding: "9px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}44`, whiteSpace: "nowrap" };
                return (
                  <React.Fragment key={o.id}>
                    <tr onClick={() => handleExpand(o.id)} style={{ cursor: "pointer",
                      background: isOpen ? C.mid + "66" : "transparent", opacity: sec.slim ? 0.75 : 1 }}>
                      <td style={{ ...tdBase, fontWeight: 700, color: C.ivory, maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</td>
                      <td style={{ ...tdBase, color: C.sage }}>{o.items || "—"}</td>
                      <td style={{ ...tdBase, color: C.sage }}>{o.date || "—"}</td>
                      <td style={{ ...tdBase, fontWeight: 700, color: fc }}>{isArchived(o) ? "🎉 完成取件" : (o.flow || o.status)}</td>
                      <td style={tdBase}>
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          {stuckDays != null && stuckDays >= 3 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: stuckDays >= 5 ? C.red : C.gold }}>⏱{stuckDays}天</span>
                          )}
                          {balanceOwed && !isArchived(o) && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>💰尾款</span>
                          )}
                          {isDone(o) && !isArchived(o) && o.wageUnconfirmedCount > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>🧾工資</span>
                          )}
                        </span>
                      </td>
                      <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>
                        {o.actualPrice ? `$${Number(o.actualPrice).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, fontFamily: "Georgia,serif",
                        color: balanceOwed ? C.red : C.sage }}>
                        {balance > 0 && balanceOwed ? `$${Number(balance).toLocaleString()}` : "—"}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${C.border}` }}>
                          {renderDetail(o)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <div style={isWide ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12, alignItems: "start" } : undefined}>
      {sec.list.map(o => {
        const isOpen = expanded === o.id;
        const fc = flowColor(o.flow);
        const balance = (o.actualPrice || 0) - (o.deposit || 0);
        const meas = measurement[o.id];
        const measLoading = loadingMeas[o.id];
        const stuckDays = (!isDone(o) && !isArchived(o)) ? daysSince(o.flowUpdatedAt) : null;
        const balanceOwed = o.balancePending || (balance > 0 && !collectedIds.has(o.id) && o.balancePending !== false);
        const slimRow = sec.slim && !isOpen;

        return (
          <div key={o.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: isWide?0:(slimRow?6:10), overflow: "hidden", boxShadow: slimRow ? "none" : C.shadowCard, opacity: slimRow ? 0.75 : 1, gridColumn: isWide && isOpen ? "1 / -1" : undefined }}>

            {/* 訂單列表行 */}
            {slimRow ? (
              <div onClick={() => handleExpand(o.id)}
                style={{ padding: "9px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.sage, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{o.name}</div>
                <span style={{ fontSize: 11, color: C.border, flexShrink: 0 }}>{o.date}</span>
                {o.actualPrice ? <span style={{ fontSize: 12, fontWeight: 700, color: C.sage, fontFamily: "Georgia,serif", flexShrink: 0 }}>${Number(o.actualPrice).toLocaleString()}</span> : null}
              </div>
            ) : (
            <div onClick={() => handleExpand(o.id)}
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {o.items && <span style={{ fontSize: 11, color: C.sage }}>{o.items}</span>}
                  {o.date && <span style={{ fontSize: 11, color: C.border }}>·</span>}
                  {o.date && <span style={{ fontSize: 11, color: C.sage }}>{o.date}</span>}
                  {balanceOwed && !isArchived(o) && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "1px 7px" }}>
                      💰 尾款未收 ${Number(balance).toLocaleString()}
                    </span>
                  )}
                  {isDone(o) && !isArchived(o) && o.wageUnconfirmedCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: C.gold + "18", border: `1px solid ${C.gold}44`, borderRadius: 10, padding: "1px 7px" }}>
                      🧾 {o.wageUnconfirmedCount} 筆工資未確認
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", marginLeft: 10, flexShrink: 0 }}>
                {o.actualPrice ? (
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>
                    ${Number(o.actualPrice).toLocaleString()}
                  </div>
                ) : null}
                <div style={{ fontSize: 11, fontWeight: 700, color: fc, marginTop: 3 }}>{isArchived(o) ? "🎉 完成取件" : (o.flow || o.status)}</div>
                {stuckDays != null && <div style={{ marginTop: 4 }}><StuckBadge days={stuckDays} C={C} /></div>}
              </div>
            </div>
            )}

            {/* 展開詳情 */}
            {isOpen && renderDetail(o)}
          </div>
        );
      })}
      </div>
      )}
      </div>
      ))}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? C.green : C.red, color: "#fff",
          padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 999,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
