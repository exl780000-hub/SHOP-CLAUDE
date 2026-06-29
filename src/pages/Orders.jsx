import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";

const FLOW_STEPS = [
  "📋 訂單建立",
  "🧵 備料",
  "📐 打版",
  "🪡 毛胚",
  "👔 試穿",
  "✂️ 製作中",
  "🔧 修改",
  "✅ 完成",
];

const FLOW_COLOR_FIXED = {
  "✅ 完成": "#5E9E6E",
  "🔧 修改": "#E05252",
  "✂️ 製作中": "#4A7AB5",
};

const FILTER_OPTS = ["全部", "進行中", "✅ 完成"];

export default function Orders() {
  const C = useTheme();
  const flowColor = (f) => FLOW_COLOR_FIXED[f] || C.gold;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("全部");
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
      const r = await fetch("/api/collect-balance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setCollectedIds(prev => new Set([...prev, orderId]));
      showToast("✅ 尾款已標記為已收");
    } catch (e) {
      showToast("失敗：" + e.message, false);
    }
    setCollectingBalance(null);
  };

  const doSearch = () => load(search);

  const filtered = orders.filter(o => {
    if (filter === "✅ 完成") return o.flow === "✅ 完成";
    if (filter === "進行中") return o.flow !== "✅ 完成";
    return true;
  });

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
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* 搜尋 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="搜尋客戶名稱或訂單編號"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.ivory, fontSize: 14, outline: "none" }} />
        <button onClick={doSearch}
          style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>搜尋</button>
      </div>

      {/* 篩選 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {FILTER_OPTS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "6px 14px",
            border: `1px solid ${filter === f ? C.gold : C.border}`,
            background: filter === f ? C.gold + "22" : "transparent",
            color: filter === f ? C.gold : C.sage,
          }}>
            {f}
            {f === "進行中" && orders.filter(o => o.flow !== "✅ 完成").length > 0 && (
              <span style={{ marginLeft: 5, background: C.gold, color: C.bg, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                {orders.filter(o => o.flow !== "✅ 完成").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>沒有找到訂單</div>
      )}

      {filtered.map(o => {
        const isOpen = expanded === o.id;
        const fc = flowColor(o.flow);
        const balance = (o.actualPrice || 0) - (o.deposit || 0);
        const meas = measurement[o.id];
        const measLoading = loadingMeas[o.id];

        return (
          <div key={o.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>

            {/* 訂單列表行 */}
            <div onClick={() => handleExpand(o.id)}
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {o.items && <span style={{ fontSize: 11, color: C.sage }}>{o.items}</span>}
                  {o.date && <span style={{ fontSize: 11, color: C.border }}>·</span>}
                  {o.date && <span style={{ fontSize: 11, color: C.sage }}>{o.date}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", marginLeft: 10, flexShrink: 0 }}>
                {o.actualPrice ? (
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>
                    ${Number(o.actualPrice).toLocaleString()}
                  </div>
                ) : null}
                <div style={{ fontSize: 11, fontWeight: 700, color: fc, marginTop: 3 }}>{o.flow || o.status}</div>
              </div>
            </div>

            {/* 展開詳情 */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>

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
            )}
          </div>
        );
      })}

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
