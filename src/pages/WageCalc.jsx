import React, { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

// 獨立工資試算：不連訂單/派工，紀錄存於專用 Notion 資料庫（工資試算紀錄）

const JACKET_BASE = 7000;
const JACKET_ADDONS = [
  { key: "雙排", add: 600 },
  { key: "劍領", add: 300 },
  { key: "票帶", add: 100 },
  { key: "半裡", add: 300 },
  { key: "全單", add: 600 },
  { key: "大衣", add: 1500 },
];
const TROUSER_BASE = 1900;
const MANAGER_FEE = { "二件式": 2000, "三件式": 2400, "外套": 1600, "褲子": 400, "背心": 400, "襯衫": 200 };
const PATTERN_FEE = { "二件式": 4500, "三件式": 5800, "外套": 3200, "褲子": 1300, "背心": 1300, "襯衫": 0 };
const VEST_OPTIONS = [
  { key: "褲子師傅製作", amount: 1900 },
  { key: "外套師傅・單排", amount: 2200 },
  { key: "外套師傅・雙排", amount: 2500 },
];
const ALTER_ITEMS = [
  { key: "肩領", add: 300 }, { key: "袖子", add: 200 }, { key: "腰身", add: 250 },
  { key: "袖長單手", add: 80 }, { key: "袖長雙手", add: 160 },
  { key: "褲長", add: 100 }, { key: "褲腳", add: 100 }, { key: "褲管", add: 150 }, { key: "臀圍", add: 200 },
];
const TABS = ["外套師傅", "褲子師傅", "經理", "背心", "修改"];

function Sec({ title, children }) {
  const C = useTheme();
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 14, boxShadow: C.shadowCard }}>
      {title && <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

function Check({ label, add, on, onToggle }) {
  const C = useTheme();
  return (
    <button onClick={onToggle} style={{
      cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600,
      padding: "7px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      border: `1px solid ${on ? C.gold : C.border}`,
      background: on ? C.gold + "22" : C.mid, color: on ? C.gold : C.sage,
    }}>
      <span>{on ? "☑" : "☐"} {label}</span>
      <span style={{ fontSize: 10, color: on ? C.gold + "cc" : C.border }}>+{add.toLocaleString()}</span>
    </button>
  );
}

function NumRow({ label, unit, value, onChange, C }) {
  return (
    <div style={{ background: C.mid, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: C.sage, flex: 1 }}>{label}</div>
      <input type="number" inputMode="numeric" min="0" value={value} placeholder="0"
        onChange={e => onChange(e.target.value)}
        style={{ width: 72, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
          padding: "5px 8px", color: C.ivory, fontSize: 15, fontWeight: 700, outline: "none", textAlign: "center" }} />
      {unit && <span style={{ fontSize: 11, color: C.sage }}>{unit}</span>}
    </div>
  );
}

// 試算合計 + 存成一筆
function SaveBar({ amount, note, name, onName, onSave }) {
  const C = useTheme();
  return (
    <div style={{ background: C.gold + "12", border: `1px solid ${C.gold}44`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>試算合計{note ? `（${note}）` : ""}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.gold, fontFamily: "Georgia,serif" }}>${amount.toLocaleString()}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={e => onName(e.target.value)} placeholder="客戶名稱（例：王先生）"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "10px 12px", color: C.ivory, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        <button onClick={onSave} disabled={!name.trim() || amount <= 0} style={{
          background: (!name.trim() || amount <= 0) ? C.mid : C.gold,
          color: (!name.trim() || amount <= 0) ? C.sage : C.bg,
          border: "none", borderRadius: 8, padding: "10px 16px",
          fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}>💾 存成一筆</button>
      </div>
    </div>
  );
}

export default function WageCalc() {
  const C = useTheme();
  const isWide = useIsWide();
  const [tab, setTab] = useState("外套師傅");
  const [custName, setCustName] = useState("");
  const [records, setRecords] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState({});   // 未結算清單勾選
  const [showSettled, setShowSettled] = useState(false);
  const [toast, setToast] = useState(null);

  const loadRecords = async () => {
    try {
      const r = await fetch("/api/wage-settlement?calc=1");
      const d = await r.json();
      if (d.success) setRecords(d.records || []);
    } catch (e) { console.error(e); }
    setLoadingRecs(false);
  };
  useEffect(() => { loadRecords(); }, []);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // 外套師傅
  const [jAddons, setJAddons] = useState({});
  const [buttonholes, setButtonholes] = useState("");
  const [milanHoles, setMilanHoles] = useState("");
  const [jExtra, setJExtra] = useState("");
  const jacketTotal = JACKET_BASE
    + JACKET_ADDONS.reduce((s, a) => s + (jAddons[a.key] ? a.add : 0), 0)
    + (Number(buttonholes) || 0) * 80
    + (Number(milanHoles) || 0) * 100
    + (Number(jExtra) || 0);
  const jacketDetail = () => {
    const parts = ["底價7000"];
    JACKET_ADDONS.forEach(a => { if (jAddons[a.key]) parts.push(a.key); });
    if (Number(buttonholes) > 0) parts.push(`扣眼${buttonholes}`);
    if (Number(milanHoles) > 0) parts.push(`米蘭眼${milanHoles}`);
    if (Number(jExtra) > 0) parts.push(`特殊${jExtra}`);
    return parts.join("・");
  };

  // 褲子師傅
  const [tExtra, setTExtra] = useState("");
  const trouserTotal = TROUSER_BASE + (Number(tExtra) || 0);

  // 經理
  const [mItem, setMItem] = useState("二件式");
  const [mExtra, setMExtra] = useState("");
  const managerTotal = (MANAGER_FEE[mItem] || 0) + (PATTERN_FEE[mItem] || 0) + (Number(mExtra) || 0);

  // 背心
  const [vestOpt, setVestOpt] = useState(VEST_OPTIONS[0].key);
  const vestTotal = VEST_OPTIONS.find(v => v.key === vestOpt)?.amount || 0;

  // 修改
  const [alterQty, setAlterQty] = useState({});
  const [aExtra, setAExtra] = useState("");
  const alterTotal = ALTER_ITEMS.reduce((s, a) => s + (Number(alterQty[a.key]) || 0) * a.add, 0) + (Number(aExtra) || 0);
  const alterDetail = () => {
    const parts = ALTER_ITEMS.filter(a => Number(alterQty[a.key]) > 0).map(a => `${a.key}×${alterQty[a.key]}`);
    if (Number(aExtra) > 0) parts.push(`特殊${aExtra}`);
    return parts.join("・");
  };

  const current = {
    "外套師傅": { amount: jacketTotal, detail: jacketDetail() },
    "褲子師傅": { amount: trouserTotal, detail: Number(tExtra) > 0 ? `固定1900・特殊${tExtra}` : "固定1900" },
    "經理":     { amount: managerTotal, detail: `${mItem}（經理${MANAGER_FEE[mItem]}＋打板${PATTERN_FEE[mItem]}${Number(mExtra) > 0 ? `＋特殊${mExtra}` : ""}）` },
    "背心":     { amount: vestTotal, detail: vestOpt },
    "修改":     { amount: alterTotal, detail: alterDetail() || "—" },
  }[tab];

  const resetCurrentTab = () => {
    if (tab === "外套師傅") { setJAddons({}); setButtonholes(""); setMilanHoles(""); setJExtra(""); }
    if (tab === "褲子師傅") setTExtra("");
    if (tab === "經理") setMExtra("");
    if (tab === "修改") { setAlterQty({}); setAExtra(""); }
  };

  const saveRecord = async () => {
    if (!custName.trim() || current.amount <= 0 || busy) return;
    setBusy(true);
    const rec = { name: custName.trim(), type: tab, detail: current.detail, amount: current.amount, date: new Date().toISOString().slice(0, 10) };
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calc-add", ...rec }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setRecords(p => [{ id: d.id, ...rec, settled: false, settledAt: null }, ...p]);
      setCustName("");
      resetCurrentTab();
      flash(`💾 已存：${rec.name}・${rec.type} $${rec.amount.toLocaleString()}`);
    } catch (e) { flash("❌ 儲存失敗：" + e.message); }
    setBusy(false);
  };

  const pending = records.filter(r => !r.settled);
  const settled = records.filter(r => r.settled);
  const checkedIds = pending.filter(r => checked[r.id]);
  const checkedSum = checkedIds.reduce((s, r) => s + r.amount, 0);
  const settledSum = settled.reduce((s, r) => s + r.amount, 0);

  const settleChecked = async () => {
    if (checkedIds.length === 0 || busy) return;
    setBusy(true);
    const ids = checkedIds.map(r => r.id);
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calc-settle", ids, settled: true }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      const today = new Date().toISOString().slice(0, 10);
      setRecords(p => p.map(rc => checked[rc.id] ? { ...rc, settled: true, settledAt: today } : rc));
      setChecked({});
      flash(`✅ 已結算 ${ids.length} 筆，共 $${checkedSum.toLocaleString()}`);
    } catch (e) { flash("❌ 結算失敗：" + e.message); }
    setBusy(false);
  };

  const removeRecord = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calc-delete", id }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setRecords(p => p.filter(rc => rc.id !== id));
    } catch (e) { flash("❌ 刪除失敗：" + e.message); }
    setBusy(false);
  };

  const unsettle = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calc-settle", ids: [id], settled: false }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setRecords(p => p.map(rc => rc.id === id ? { ...rc, settled: false, settledAt: null } : rc));
    } catch (e) { flash("❌ 退回失敗：" + e.message); }
    setBusy(false);
  };

  const chip = (on) => ({
    cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "9px 4px", flex: 1,
    border: `1px solid ${on ? C.gold : C.border}`,
    background: on ? C.gold + "22" : C.card, color: on ? C.gold : C.sage,
  });

  const RecRow = ({ r, mode }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}44` }}>
      {mode === "pending" && (
        <button onClick={() => setChecked(p => ({ ...p, [r.id]: !p[r.id] }))} style={{
          width: 24, height: 24, borderRadius: 6, cursor: "pointer", flexShrink: 0,
          border: `1px solid ${checked[r.id] ? C.gold : C.border}`,
          background: checked[r.id] ? C.gold : "transparent",
          color: checked[r.id] ? C.bg : "transparent", fontSize: 14, fontWeight: 800, lineHeight: 1,
        }}>✓</button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>
          {r.name}<span style={{ fontSize: 11, fontWeight: 600, color: C.sage, marginLeft: 6 }}>{r.type}</span>
        </div>
        <div style={{ fontSize: 10, color: C.sage, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.date}{r.settledAt ? `・結算 ${r.settledAt}` : ""}・{r.detail}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: mode === "pending" ? C.gold : C.green, fontFamily: "Georgia,serif", flexShrink: 0 }}>
        ${r.amount.toLocaleString()}
      </div>
      {mode === "pending" ? (
        <button onClick={() => removeRecord(r.id)} title="刪除" style={{
          background: "transparent", border: "none", color: C.red, fontSize: 14, cursor: "pointer", flexShrink: 0, padding: "0 2px",
        }}>✕</button>
      ) : (
        <button onClick={() => unsettle(r.id)} title="退回未結算" style={{
          background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.sage, fontSize: 10, cursor: "pointer", flexShrink: 0, padding: "3px 7px",
        }}>退回</button>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: isWide ? 640 : 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <div style={{ fontSize: 11, color: C.sage, marginBottom: 10 }}>
        🧮 獨立試算工具：勾選計算 → 輸入客戶存成一筆 → 勾選多筆結算總額。紀錄存於 Notion「工資試算紀錄」，跨裝置共用。
      </div>

      {/* 類型切換 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={chip(tab === t)}>{t}</button>
        ))}
      </div>

      {/* 外套師傅 */}
      {tab === "外套師傅" && (
        <Sec title={`👔 外套師傅（底價 $${JACKET_BASE.toLocaleString()}）`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {JACKET_ADDONS.map(a => (
              <Check key={a.key} label={a.key} add={a.add} on={!!jAddons[a.key]}
                onToggle={() => setJAddons(p => ({ ...p, [a.key]: !p[a.key] }))} />
            ))}
          </div>
          <NumRow label="扣眼（×80／顆）" unit="顆" value={buttonholes} onChange={setButtonholes} C={C} />
          <NumRow label="米蘭眼（×100／顆）" unit="顆" value={milanHoles} onChange={setMilanHoles} C={C} />
          <NumRow label="特殊加項（$）" value={jExtra} onChange={setJExtra} C={C} />
          <div style={{ fontSize: 10, color: C.border, marginTop: 4 }}>
            扣眼參考：前身 單排=扣數（常見2）／雙排6扣2、6扣3=3顆；袖扣×雙手（袖3扣=6、袖4扣=8）；米蘭眼通常1顆
          </div>
        </Sec>
      )}

      {/* 褲子師傅 */}
      {tab === "褲子師傅" && (
        <Sec title={`👖 褲子師傅（固定 $${TROUSER_BASE.toLocaleString()}）`}>
          <NumRow label="特殊加項（$）" value={tExtra} onChange={setTExtra} C={C} />
        </Sec>
      )}

      {/* 經理 */}
      {tab === "經理" && (
        <Sec title="🧑‍💼 經理費＋打板費">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {Object.keys(MANAGER_FEE).map(item => (
              <button key={item} onClick={() => setMItem(item)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "8px 14px",
                border: `1px solid ${mItem === item ? C.gold : C.border}`,
                background: mItem === item ? C.gold + "22" : C.mid, color: mItem === item ? C.gold : C.sage,
              }}>{item}</button>
            ))}
          </div>
          <div style={{ background: C.mid, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span style={{ fontSize: 12, color: C.sage }}>經理費</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory, fontFamily: "Georgia,serif" }}>${(MANAGER_FEE[mItem] || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span style={{ fontSize: 12, color: C.sage }}>打板費</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory, fontFamily: "Georgia,serif" }}>${(PATTERN_FEE[mItem] || 0).toLocaleString()}</span>
            </div>
          </div>
          <NumRow label="特殊加項（$）" value={mExtra} onChange={setMExtra} C={C} />
        </Sec>
      )}

      {/* 背心 */}
      {tab === "背心" && (
        <Sec title="🦺 背心工資">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {VEST_OPTIONS.map(v => (
              <button key={v.key} onClick={() => setVestOpt(v.key)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "12px 14px",
                display: "flex", justifyContent: "space-between",
                border: `1px solid ${vestOpt === v.key ? C.gold : C.border}`,
                background: vestOpt === v.key ? C.gold + "22" : C.mid, color: vestOpt === v.key ? C.gold : C.sage,
              }}>
                <span>{vestOpt === v.key ? "◉" : "○"} {v.key}</span>
                <span style={{ fontFamily: "Georgia,serif", fontWeight: 700 }}>${v.amount.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </Sec>
      )}

      {/* 修改 */}
      {tab === "修改" && (
        <Sec title="✂️ 修改工資（輸入數量）">
          {ALTER_ITEMS.map(a => (
            <NumRow key={a.key} label={`${a.key}（×${a.add}）`} unit="次"
              value={alterQty[a.key] || ""} onChange={v => setAlterQty(p => ({ ...p, [a.key]: v }))} C={C} />
          ))}
          <NumRow label="特殊加項（$）" value={aExtra} onChange={setAExtra} C={C} />
        </Sec>
      )}

      {/* 合計 + 存成一筆 */}
      <SaveBar amount={current.amount} note={tab === "經理" ? mItem : ""} name={custName} onName={setCustName} onSave={saveRecord} />

      {loadingRecs && <div style={{ color: C.sage, fontSize: 12, textAlign: "center", padding: 16 }}>紀錄載入中...</div>}

      {/* 未結算清單 */}
      {pending.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Sec title={`📋 未結算（${pending.length} 筆）`}>
            {pending.map(r => <RecRow key={r.id} r={r} mode="pending" />)}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
              <span style={{ fontSize: 12, color: C.sage }}>
                已勾選 {checkedIds.length} 筆
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>
                ${checkedSum.toLocaleString()}
              </span>
            </div>
            <button onClick={settleChecked} disabled={checkedIds.length === 0} style={{
              width: "100%", marginTop: 10, padding: "12px", borderRadius: 10, border: "none",
              background: checkedIds.length === 0 ? C.mid : C.green,
              color: checkedIds.length === 0 ? C.sage : "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              {checkedIds.length === 0 ? "勾選要結算的紀錄" : `✅ 結算勾選 ${checkedIds.length} 筆　$${checkedSum.toLocaleString()}`}
            </button>
          </Sec>
        </div>
      )}

      {/* 已結算 */}
      {settled.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setShowSettled(v => !v)} style={{
            width: "100%", padding: "11px 14px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${C.green}44`, background: C.green + "10",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
              ✅ 已結算（{settled.length} 筆）{showSettled ? "▲" : "▼"}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: "Georgia,serif" }}>
              ${settledSum.toLocaleString()}
            </span>
          </button>
          {showSettled && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px 14px", marginTop: 6 }}>
              {settled.map(r => <RecRow key={r.id} r={r} mode="settled" />)}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: C.green, color: "#fff", padding: "10px 20px", borderRadius: 20,
          fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 999,
          maxWidth: 320, textAlign: "center",
        }}>{toast}</div>
      )}
    </div>
  );
}
