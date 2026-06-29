import { useState, useEffect } from "react";

const C = {
  bg: "#0F1923", card: "#1A2535", border: "#2A3A50",
  gold: "#C9A84C", ivory: "#F0EBE0", sage: "#7A9E8A",
  green: "#5E9E6E", red: "#E05252", mid: "#2A3A50", blue: "#4A7AB5",
};

const TAILORS = ["全部", "外套師傅", "褲子師傅", "經理"];

// 經理費 + 打板費對照表
const MANAGER_FEE = { "外套": 1600, "褲子": 400, "二件式": 2000, "三件式": 2400, "背心": 400, "襯衫": 200 };
const PATTERN_FEE = { "外套": 3200, "褲子": 1300, "二件式": 4500, "三件式": 5800, "背心": 1300, "襯衫": 0 };

function monthStr(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}

function detectItem(items = "") {
  if (items.includes("三件式")) return "三件式";
  if (items.includes("二件式")) return "二件式";
  if (items.includes("外套")) return "外套";
  if (items.includes("褲子")) return "褲子";
  if (items.includes("背心")) return "背心";
  if (items.includes("襯衫")) return "襯衫";
  return "";
}

function SaveBtn({ saving, dirty, onClick }) {
  if (!dirty) return null;
  return (
    <button onClick={onClick} disabled={saving} style={{
      background: saving ? C.mid : C.green, color: saving ? C.sage : "#fff",
      border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13,
      fontWeight: 700, cursor: saving ? "default" : "pointer",
    }}>{saving ? "儲存中" : "儲存"}</button>
  );
}

function CheckItem({ label, add, checked, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600,
      padding: "7px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      border: `1px solid ${checked ? C.gold : C.border}`,
      background: checked ? C.gold + "22" : C.mid,
      color: checked ? C.gold : C.sage,
    }}>
      <span>{checked ? "☑" : "☐"} {label}</span>
      <span style={{ fontSize: 10, color: checked ? C.gold + "cc" : C.border }}>+{add.toLocaleString()}</span>
    </button>
  );
}

// ── 外套師傅工資卡 ──
function JacketWageCard({ order, onSaved }) {
  const BASE = 7000;
  const [doubles, setDoubles] = useState(false);
  const [milan, setMilan] = useState(false);
  const [buttonholes, setButtonholes] = useState(0);
  const [milanHoles, setMilanHoles] = useState(0);
  const [ticket, setTicket] = useState(false);
  const [sword, setSword] = useState(false);
  const [half, setHalf] = useState(false);
  const [full, setFull] = useState(false);
  const [overcoat, setOvercoat] = useState(false);
  const [extra, setExtra] = useState(0);
  const [override, setOverride] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const calcTotal = BASE
    + (doubles ? 600 : 0)
    + (Number(buttonholes) || 0) * 80
    + (Number(milanHoles) || 0) * 100
    + (ticket ? 100 : 0)
    + (sword ? 300 : 0)
    + (half ? 300 : 0)
    + (full ? 600 : 0)
    + (overcoat ? 1500 : 0)
    + (Number(extra) || 0);

  const finalWage = override !== "" ? (Number(override) || 0) : calcTotal;
  const savedWage = order.jacketWage || 0;
  const dirty = finalWage !== savedWage;

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          jacketWage: finalWage,
          trouserWage: order.trouserWage || 0,
          managerFee: order.managerFee || 0,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      onSaved(order.id, { jacketWage: finalWage, totalWage: finalWage + (order.trouserWage || 0) + (order.managerFee || 0) });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("儲存失敗：" + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      {/* 標題 */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{order.name}</div>
          <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{order.items} · {order.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${finalWage.toLocaleString()}</div>
          {dirty && <div style={{ fontSize: 10, color: C.gold }}>未儲存</div>}
          {saved && <div style={{ fontSize: 10, color: C.green }}>✅ 已儲存</div>}
          {savedWage > 0 && !dirty && <div style={{ fontSize: 10, color: C.sage }}>已儲存 ${savedWage.toLocaleString()}</div>}
        </div>
      </div>

      {/* 款式參考 */}
      {order.jacketStyle && (
        <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}44`, background: C.mid + "88" }}>
          <div style={{ fontSize: 10, color: C.sage, marginBottom: 3 }}>外套款式</div>
          <div style={{ fontSize: 12, color: C.ivory, lineHeight: 1.5 }}>{order.jacketStyle}</div>
        </div>
      )}

      {/* 加價項目 */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 11, color: C.sage, marginBottom: 8 }}>底價 ${BASE.toLocaleString()} ＋ 加價項目</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <CheckItem label="雙排" add={600} checked={doubles} onToggle={() => setDoubles(v => !v)} />
          <CheckItem label="劍領" add={300} checked={sword} onToggle={() => setSword(v => !v)} />
          <CheckItem label="票帶" add={100} checked={ticket} onToggle={() => setTicket(v => !v)} />
          <CheckItem label="半裡" add={300} checked={half} onToggle={() => setHalf(v => !v)} />
          <CheckItem label="全單" add={600} checked={full} onToggle={() => setFull(v => !v)} />
          <CheckItem label="大衣" add={1500} checked={overcoat} onToggle={() => setOvercoat(v => !v)} />
        </div>

        {/* 扣眼/米蘭眼 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {[
            { label: "扣眼 (×80)", val: buttonholes, set: setButtonholes, checked: milan, checkLabel: null },
            { label: "米蘭眼 (×100)", val: milanHoles, set: setMilanHoles },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ flex: 1, background: C.mid, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="number" min="0" value={val} onChange={e => set(e.target.value)}
                  style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: "4px 8px", color: C.ivory, fontSize: 14, fontWeight: 700, outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: 11, color: C.sage }}>顆</span>
              </div>
              {Number(val) > 0 && <div style={{ fontSize: 10, color: C.gold, marginTop: 3 }}>+{(Number(val) * (label.includes("米蘭") ? 100 : 80)).toLocaleString()}</div>}
            </div>
          ))}
        </div>

        {/* 特殊加項 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>特殊加項 ($)</div>
          <input type="number" value={extra} onChange={e => setExtra(e.target.value)} placeholder="0"
            style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
        </div>

        {/* 工資合計 + 手動覆蓋 */}
        <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: C.sage }}>計算結果</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${calcTotal.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>手動調整（選填，留空使用計算結果）</div>
          <input type="number" value={override} onChange={e => setOverride(e.target.value)} placeholder={String(calcTotal)}
            style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${override !== "" ? C.gold : C.border}`,
              borderRadius: 6, padding: "7px 10px", color: C.gold, fontSize: 15, fontWeight: 700,
              outline: "none", fontFamily: "Georgia,serif", textAlign: "right" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={saving} dirty={dirty} onClick={save} />
        </div>
      </div>
    </div>
  );
}

// ── 褲子師傅工資卡 ──
function TrouserWageCard({ order, onSaved }) {
  const BASE = 1900;
  const [extra, setExtra] = useState(0);
  const [override, setOverride] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const calcTotal = BASE + (Number(extra) || 0);
  const finalWage = override !== "" ? (Number(override) || 0) : calcTotal;
  const savedWage = order.trouserWage || 0;
  const dirty = finalWage !== savedWage;

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          jacketWage: order.jacketWage || 0,
          trouserWage: finalWage,
          managerFee: order.managerFee || 0,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      onSaved(order.id, { trouserWage: finalWage, totalWage: (order.jacketWage || 0) + finalWage + (order.managerFee || 0) });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("儲存失敗：" + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{order.name}</div>
          <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{order.items} · {order.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${finalWage.toLocaleString()}</div>
          {dirty && <div style={{ fontSize: 10, color: C.gold }}>未儲存</div>}
          {saved && <div style={{ fontSize: 10, color: C.green }}>✅ 已儲存</div>}
        </div>
      </div>

      {order.trouserStyle && (
        <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}44`, background: C.mid + "88" }}>
          <div style={{ fontSize: 10, color: C.sage, marginBottom: 3 }}>褲子款式</div>
          <div style={{ fontSize: 12, color: C.ivory, lineHeight: 1.5 }}>{order.trouserStyle}</div>
        </div>
      )}

      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 11, color: C.sage, marginBottom: 12 }}>底價 ${BASE.toLocaleString()}</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>特殊加項 ($)</div>
          <input type="number" value={extra} onChange={e => setExtra(e.target.value)} placeholder="0"
            style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
        </div>
        <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: C.sage }}>計算結果</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${calcTotal.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>手動調整（選填）</div>
          <input type="number" value={override} onChange={e => setOverride(e.target.value)} placeholder={String(calcTotal)}
            style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${override !== "" ? C.gold : C.border}`,
              borderRadius: 6, padding: "7px 10px", color: C.gold, fontSize: 15, fontWeight: 700,
              outline: "none", fontFamily: "Georgia,serif", textAlign: "right" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={saving} dirty={dirty} onClick={save} />
        </div>
      </div>
    </div>
  );
}

// ── 經理費卡 ──
function ManagerFeeCard({ order, onSaved }) {
  const item = detectItem(order.items);
  const baseMgr = MANAGER_FEE[item] || 0;
  const basePat = PATTERN_FEE[item] || 0;
  const [override, setOverride] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const calcTotal = baseMgr + basePat;
  const finalWage = override !== "" ? (Number(override) || 0) : calcTotal;
  const savedWage = order.managerFee || 0;
  const dirty = finalWage !== savedWage;

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/update-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          jacketWage: order.jacketWage || 0,
          trouserWage: order.trouserWage || 0,
          managerFee: finalWage,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      onSaved(order.id, { managerFee: finalWage, totalWage: (order.jacketWage || 0) + (order.trouserWage || 0) + finalWage });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("儲存失敗：" + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{order.name}</div>
          <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{order.items} · {order.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${finalWage.toLocaleString()}</div>
          {dirty && <div style={{ fontSize: 10, color: C.gold }}>未儲存</div>}
          {saved && <div style={{ fontSize: 10, color: C.green }}>✅ 已儲存</div>}
        </div>
      </div>

      <div style={{ padding: "12px 14px" }}>
        {/* 費用明細 */}
        <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 8 }}>費用明細（{item || "未知品項"}）</div>
          {[
            { label: "經理費", val: baseMgr },
            { label: "打板費", val: basePat },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}44` }}>
              <span style={{ fontSize: 13, color: C.ivory }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: val > 0 ? C.ivory : C.border, fontFamily: "Georgia,serif" }}>${val.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0" }}>
            <span style={{ fontSize: 13, color: C.sage }}>小計</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${calcTotal.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>手動調整（選填）</div>
        <input type="number" value={override} onChange={e => setOverride(e.target.value)} placeholder={String(calcTotal)}
          style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${override !== "" ? C.gold : C.border}`,
            borderRadius: 6, padding: "7px 10px", color: C.gold, fontSize: 15, fontWeight: 700,
            outline: "none", fontFamily: "Georgia,serif", textAlign: "right", marginBottom: 12 }} />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={saving} dirty={dirty} onClick={save} />
        </div>
      </div>
    </div>
  );
}

// ── 全部師傅工資卡（原版三欄） ──
function FullWageCard({ order, onSaved }) {
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
        body: JSON.stringify({ orderId: order.id, jacketWage: Number(j) || 0, trouserWage: Number(t) || 0, managerFee: Number(m) || 0 }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      onSaved(order.id, { jacketWage: Number(j), trouserWage: Number(t), managerFee: Number(m), totalWage: total });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("儲存失敗：" + e.message); }
    setSaving(false);
  };

  const Row = ({ label, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.border}44` }}>
      <div style={{ width: 80, fontSize: 12, color: C.sage, flexShrink: 0 }}>{label}</div>
      <span style={{ fontSize: 11, color: C.border }}>$</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 6,
          padding: "5px 8px", color: C.ivory, fontSize: 14, fontWeight: 700, outline: "none",
          fontFamily: "Georgia,serif", textAlign: "right" }} />
    </div>
  );

  const hasJacket = order.items?.includes("外套") || order.items?.includes("二件式") || order.items?.includes("三件式");
  const hasTrouser = order.items?.includes("褲子") || order.items?.includes("二件式") || order.items?.includes("三件式");

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{order.name}</div>
          <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{order.items} · {order.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${total.toLocaleString()}</div>
          {dirty && <div style={{ fontSize: 10, color: C.gold }}>未儲存</div>}
          {saved && <div style={{ fontSize: 10, color: C.green }}>✅ 已儲存</div>}
        </div>
      </div>
      <div style={{ padding: "8px 14px" }}>
        {(hasJacket || Number(j) > 0) && <Row label="外套師傅" value={j} onChange={setJ} />}
        {(hasTrouser || Number(t) > 0) && <Row label="褲子師傅" value={t} onChange={setT} />}
        <Row label="經理費" value={m} onChange={setM} />
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
            <SaveBtn saving={saving} dirty={dirty} onClick={save} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Wages() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchedOrderIds, setDispatchedOrderIds] = useState(null);

  const [timeMode, setTimeMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(monthStr(0));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tailor, setTailor] = useState("全部");

  const loadOrders = async () => {
    try {
      const r = await fetch("/api/orders?q=");
      const d = await r.json();
      setOrders(d.orders || []);
    } catch (e) { console.error(e); }
  };

  const loadDispatchedIds = async (selectedTailor) => {
    if (selectedTailor === "全部") { setDispatchedOrderIds(null); return; }
    try {
      const r = await fetch(`/api/dispatches?tailor=${encodeURIComponent(selectedTailor)}`);
      const d = await r.json();
      const ids = new Set((d.dispatches || []).flatMap(dp => dp.orderRel || []));
      setDispatchedOrderIds(ids);
    } catch (e) { setDispatchedOrderIds(null); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOrders(), loadDispatchedIds(tailor)]).finally(() => setLoading(false));
  }, []);

  const handleTailorChange = async (t) => {
    setTailor(t);
    await loadDispatchedIds(t);
  };

  const handleSaved = (orderId, updated) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
  };

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    if (timeMode === "month") return dateStr.startsWith(selectedMonth);
    if (timeMode === "custom") {
      if (!customStart && !customEnd) return true;
      if (customStart && dateStr < customStart) return false;
      if (customEnd && dateStr > customEnd) return false;
      return true;
    }
    return true;
  };

  const filtered = orders.filter(o =>
    inRange(o.date) && (dispatchedOrderIds === null || dispatchedOrderIds.has(o.id))
  );

  const sumJacket  = filtered.reduce((s, o) => s + (o.jacketWage  || 0), 0);
  const sumTrouser = filtered.reduce((s, o) => s + (o.trouserWage || 0), 0);
  const sumManager = filtered.reduce((s, o) => s + (o.managerFee  || 0), 0);
  const sumTotal   = filtered.reduce((s, o) => s + (o.totalWage   || 0), 0);

  const quickMonths = [
    { label: "上上月", val: monthStr(-2) },
    { label: "上月",   val: monthStr(-1) },
    { label: "本月",   val: monthStr(0)  },
  ];

  const renderCard = (o) => {
    if (tailor === "外套師傅") return <JacketWageCard key={o.id} order={o} onSaved={handleSaved} />;
    if (tailor === "褲子師傅") return <TrouserWageCard key={o.id} order={o} onSaved={handleSaved} />;
    if (tailor === "經理")    return <ManagerFeeCard key={o.id} order={o} onSaved={handleSaved} />;
    return <FullWageCard key={o.id} order={o} onSaved={handleSaved} />;
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* 時間篩選 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 10 }}>📅 時間篩選</div>
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
        {timeMode === "month" && (
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: C.mid, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "8px 12px", color: C.ivory, fontSize: 14, outline: "none" }} />
        )}
        {timeMode === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "8px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
            <span style={{ color: C.sage, fontSize: 12 }}>～</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ flex: 1, background: C.mid, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "8px 10px", color: C.ivory, fontSize: 13, outline: "none" }} />
          </div>
        )}
      </div>

      {/* 師傅篩選 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {TAILORS.map(t => (
          <button key={t} onClick={() => handleTailorChange(t)} style={{
            flex: 1, cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "10px 0",
            border: `1px solid ${tailor === t ? C.gold : C.border}`,
            background: tailor === t ? C.gold + "22" : "transparent",
            color: tailor === t ? C.gold : C.sage,
          }}>{t}</button>
        ))}
      </div>

      {/* 工資合計摘要 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 10 }}>
          💰 工資合計
          <span style={{ marginLeft: 8, fontSize: 10, color: C.sage, fontWeight: 400 }}>{filtered.length} 筆</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {[
            { label: "外套師傅", val: sumJacket,  show: tailor === "全部" || tailor === "外套師傅" },
            { label: "褲子師傅", val: sumTrouser, show: tailor === "全部" || tailor === "褲子師傅" },
            { label: "經理費",   val: sumManager, show: tailor === "全部" || tailor === "經理" },
            { label: "合計",     val: sumTotal,   show: tailor === "全部", highlight: true },
          ].filter(x => x.show).map(({ label, val, highlight }) => (
            <div key={label} style={{ background: C.mid, borderRadius: 8, padding: "10px 12px", border: highlight ? `1px solid ${C.gold}44` : "none" }}>
              <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? C.gold : C.ivory, fontFamily: "Georgia,serif" }}>${val.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: C.sage, textAlign: "center", padding: 30 }}>載入中...</div>}
      {!loading && filtered.length === 0 && <div style={{ color: C.sage, textAlign: "center", padding: 40 }}>此區間無派工記錄</div>}

      {filtered.map(o => renderCard(o))}
    </div>
  );
}
