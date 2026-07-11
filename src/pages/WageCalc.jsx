import React, { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

// 獨立工資試算：不連訂單/派工，紀錄存於專用 Notion 資料庫（工資試算紀錄）
// 每位師傅獨立分頁與清單：A 師傅存的紀錄不會出現在 B 師傅頁面

const TAILORS = ["外套師傅", "褲子師傅", "經理"];
const TAILOR_ITEMS = {
  "外套師傅": ["外套", "修改", "背心"],
  "褲子師傅": ["褲子", "背心"],
  "經理": ["經理"],
};

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
// 外套師傅修改項目（僅外套類）
const ALTER_ITEMS = [
  { key: "肩領", add: 300 }, { key: "袖子", add: 200 }, { key: "腰身", add: 250 },
  { key: "袖長單手", add: 80 }, { key: "袖長雙手", add: 160 },
];

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
function SaveBar({ amount, note, name, onName, onSave, busy }) {
  const C = useTheme();
  const disabled = !name.trim() || amount <= 0 || busy;
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
        <button onClick={onSave} disabled={disabled} style={{
          background: disabled ? C.mid : C.gold,
          color: disabled ? C.sage : C.bg,
          border: "none", borderRadius: 8, padding: "10px 16px",
          fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}>{busy ? "…" : "💾 存成一筆"}</button>
      </div>
    </div>
  );
}

export default function WageCalc() {
  const C = useTheme();
  const isWide = useIsWide();
  const [tailor, setTailor] = useState("外套師傅");
  const [jacketItem, setJacketItem] = useState("外套");   // 外套師傅內項目
  const [trouserItem, setTrouserItem] = useState("褲子"); // 褲子師傅內項目
  const [custName, setCustName] = useState("");
  const [records, setRecords] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState({});
  const [showSettled, setShowSettled] = useState(false);
  const [toast, setToast] = useState(null);

  const item = tailor === "外套師傅" ? jacketItem : tailor === "褲子師傅" ? trouserItem : "經理";

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

  // ── 外套（外套師傅）──
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

  // ── 修改（外套師傅）──
  const [alterQty, setAlterQty] = useState({});
  const [aExtra, setAExtra] = useState("");
  const alterTotal = ALTER_ITEMS.reduce((s, a) => s + (Number(alterQty[a.key]) || 0) * a.add, 0) + (Number(aExtra) || 0);
  const alterDetail = () => {
    const parts = ALTER_ITEMS.filter(a => Number(alterQty[a.key]) > 0).map(a => `${a.key}×${alterQty[a.key]}`);
    if (Number(aExtra) > 0) parts.push(`特殊${aExtra}`);
    return parts.join("・") || "—";
  };

  // ── 背心（外套師傅：單排2200/雙排2500；褲子師傅：固定1900）──
  const [vestDouble, setVestDouble] = useState(false);
  const vestJacketAmount = vestDouble ? 2500 : 2200;

  // ── 褲子（褲子師傅）──
  const [tExtra, setTExtra] = useState("");
  const trouserTotal = TROUSER_BASE + (Number(tExtra) || 0);

  // ── 經理 ──
  const [mItem, setMItem] = useState("二件式");
  const [mExtra, setMExtra] = useState("");
  const managerTotal = (MANAGER_FEE[mItem] || 0) + (PATTERN_FEE[mItem] || 0) + (Number(mExtra) || 0);

  // 目前 (師傅, 項目) 的金額與明細
  const current = (() => {
    if (tailor === "外套師傅") {
      if (item === "外套") return { amount: jacketTotal, detail: `外套｜${jacketDetail()}` };
      if (item === "修改") return { amount: alterTotal, detail: `修改｜${alterDetail()}` };
      return { amount: vestJacketAmount, detail: `背心｜${vestDouble ? "雙排" : "單排"}` };
    }
    if (tailor === "褲子師傅") {
      if (item === "褲子") return { amount: trouserTotal, detail: `褲子｜固定1900${Number(tExtra) > 0 ? `・特殊${tExtra}` : ""}` };
      return { amount: 1900, detail: "背心｜固定1900" };
    }
    return { amount: managerTotal, detail: `${mItem}｜經理${MANAGER_FEE[mItem]}＋打板${PATTERN_FEE[mItem]}${Number(mExtra) > 0 ? `＋特殊${mExtra}` : ""}` };
  })();

  const resetCurrentForm = () => {
    if (tailor === "外套師傅") {
      if (item === "外套") { setJAddons({}); setButtonholes(""); setMilanHoles(""); setJExtra(""); }
      if (item === "修改") { setAlterQty({}); setAExtra(""); }
      if (item === "背心") setVestDouble(false);
    }
    if (tailor === "褲子師傅") setTExtra("");
    if (tailor === "經理") setMExtra("");
  };

  const saveRecord = async () => {
    if (!custName.trim() || current.amount <= 0 || busy) return;
    setBusy(true);
    const rec = { name: custName.trim(), type: tailor, detail: current.detail, amount: current.amount, date: new Date().toISOString().slice(0, 10) };
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calc-add", ...rec }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setRecords(p => [{ id: d.id, ...rec, settled: false, settledAt: null }, ...p]);
      setCustName("");
      resetCurrentForm();
      flash(`💾 已存：${rec.name}・${current.detail.split("｜")[0]} $${rec.amount.toLocaleString()}`);
    } catch (e) { flash("❌ 儲存失敗：" + e.message); }
    setBusy(false);
  };

  // ── 清單：只顯示目前師傅的紀錄 ──
  const mine = records.filter(r => r.type === tailor);
  const pending = mine.filter(r => !r.settled);
  const settled = mine.filter(r => r.settled);
  const checkedIds = pending.filter(r => checked[r.id]);
  const checkedSum = checkedIds.reduce((s, r) => s + r.amount, 0);
  const settledSum = settled.reduce((s, r) => s + r.amount, 0);

  const allChecked = pending.length > 0 && pending.every(r => checked[r.id]);
  const toggleAll = () => {
    if (allChecked) { setChecked({}); return; }
    const next = {};
    pending.forEach(r => { next[r.id] = true; });
    setChecked(next);
  };

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
      flash(`✅ ${tailor} 已結算 ${ids.length} 筆，共 $${checkedSum.toLocaleString()}`);
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
    cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "10px 4px", flex: 1,
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
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>{r.name}</div>
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

  const itemOptions = TAILOR_ITEMS[tailor];

  return (
    <div style={{ maxWidth: isWide ? 640 : 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <div style={{ fontSize: 11, color: C.sage, marginBottom: 10 }}>
        🧮 獨立試算：各師傅分開記錄與結算，互不相干。紀錄存於 Notion「工資試算紀錄」。
      </div>

      {/* 師傅切換 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {TAILORS.map(t => (
          <button key={t} onClick={() => { setTailor(t); setChecked({}); }} style={chip(tailor === t)}>{t}</button>
        ))}
      </div>

      {/* 項目切換（該師傅可做的項目） */}
      {itemOptions.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {itemOptions.map(it => {
            const on = item === it;
            return (
              <button key={it} onClick={() => tailor === "外套師傅" ? setJacketItem(it) : setTrouserItem(it)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "8px 4px", flex: 1,
                border: `1px solid ${on ? C.blue : C.border}`,
                background: on ? C.blue + "22" : C.mid, color: on ? C.blue : C.sage,
              }}>{it}</button>
            );
          })}
        </div>
      )}

      {/* ── 外套師傅：外套 ── */}
      {tailor === "外套師傅" && item === "外套" && (
        <Sec title={`👔 外套製作（底價 $${JACKET_BASE.toLocaleString()}）`}>
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

      {/* ── 外套師傅：修改 ── */}
      {tailor === "外套師傅" && item === "修改" && (
        <Sec title="✂️ 修改（輸入次數）">
          {ALTER_ITEMS.map(a => (
            <NumRow key={a.key} label={`${a.key}（×${a.add}）`} unit="次"
              value={alterQty[a.key] || ""} onChange={v => setAlterQty(p => ({ ...p, [a.key]: v }))} C={C} />
          ))}
          <NumRow label="特殊加項（$）" value={aExtra} onChange={setAExtra} C={C} />
        </Sec>
      )}

      {/* ── 外套師傅：背心 ── */}
      {tailor === "外套師傅" && item === "背心" && (
        <Sec title="🦺 背心製作">
          <div style={{ display: "flex", gap: 8 }}>
            {[{ label: "單排 $2,200", v: false }, { label: "雙排 $2,500", v: true }].map(o => (
              <button key={o.label} onClick={() => setVestDouble(o.v)} style={{
                flex: 1, cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "12px 4px",
                border: `1px solid ${vestDouble === o.v ? C.gold : C.border}`,
                background: vestDouble === o.v ? C.gold + "22" : C.mid, color: vestDouble === o.v ? C.gold : C.sage,
              }}>{vestDouble === o.v ? "◉ " : "○ "}{o.label}</button>
            ))}
          </div>
        </Sec>
      )}

      {/* ── 褲子師傅：褲子 ── */}
      {tailor === "褲子師傅" && item === "褲子" && (
        <Sec title={`👖 褲子製作（固定 $${TROUSER_BASE.toLocaleString()}）`}>
          <NumRow label="特殊加項（$）" value={tExtra} onChange={setTExtra} C={C} />
        </Sec>
      )}

      {/* ── 褲子師傅：背心 ── */}
      {tailor === "褲子師傅" && item === "背心" && (
        <Sec title="🦺 背心製作">
          <div style={{ background: C.mid, borderRadius: 8, padding: "14px", textAlign: "center", fontSize: 13, color: C.sage }}>
            褲子師傅製作背心：固定 <span style={{ color: C.gold, fontWeight: 700, fontFamily: "Georgia,serif" }}>$1,900</span>
          </div>
        </Sec>
      )}

      {/* ── 經理 ── */}
      {tailor === "經理" && (
        <Sec title="🧑‍💼 經理費＋打板費">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {Object.keys(MANAGER_FEE).map(it => (
              <button key={it} onClick={() => setMItem(it)} style={{
                cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "8px 14px",
                border: `1px solid ${mItem === it ? C.gold : C.border}`,
                background: mItem === it ? C.gold + "22" : C.mid, color: mItem === it ? C.gold : C.sage,
              }}>{it}</button>
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

      {/* 合計 + 存成一筆 */}
      <SaveBar amount={current.amount} note={`${tailor}・${item === "經理" ? mItem : item}`}
        name={custName} onName={setCustName} onSave={saveRecord} busy={busy} />

      {loadingRecs && <div style={{ color: C.sage, fontSize: 12, textAlign: "center", padding: 16 }}>紀錄載入中...</div>}

      {/* 未結算清單（僅此師傅） */}
      {pending.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Sec title={`📋 ${tailor}・未結算（${pending.length} 筆）`}>
            <button onClick={toggleAll} style={{
              marginBottom: 6, cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 700, padding: "7px 14px",
              border: `1px solid ${allChecked ? C.gold : C.border}`,
              background: allChecked ? C.gold + "22" : C.mid, color: allChecked ? C.gold : C.sage,
            }}>{allChecked ? "☑ 取消全選" : "☐ 全部勾選"}</button>
            {pending.map(r => <RecRow key={r.id} r={r} mode="pending" />)}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
              <span style={{ fontSize: 12, color: C.sage }}>已勾選 {checkedIds.length} 筆</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${checkedSum.toLocaleString()}</span>
            </div>
            <button onClick={settleChecked} disabled={checkedIds.length === 0 || busy} style={{
              width: "100%", marginTop: 10, padding: "12px", borderRadius: 10, border: "none",
              background: checkedIds.length === 0 ? C.mid : C.green,
              color: checkedIds.length === 0 ? C.sage : "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              {checkedIds.length === 0 ? "勾選要結算的紀錄" : `✅ 結算 ${tailor} ${checkedIds.length} 筆　$${checkedSum.toLocaleString()}`}
            </button>
          </Sec>
        </div>
      )}

      {/* 已結算（僅此師傅） */}
      {settled.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setShowSettled(v => !v)} style={{
            width: "100%", padding: "11px 14px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${C.green}44`, background: C.green + "10",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
              ✅ {tailor}・已結算（{settled.length} 筆）{showSettled ? "▲" : "▼"}
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
