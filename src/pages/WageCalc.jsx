import React, { useState } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

// 獨立工資試算：純手動輸入勾選，不連訂單/派工/Notion，不寫入任何資料

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
      {Number(value) > 0 && <span style={{ fontSize: 11, color: C.gold, minWidth: 52, textAlign: "right" }}>+{(Number(value)).toLocaleString()}</span>}
    </div>
  );
}

function Total({ amount, note }) {
  const C = useTheme();
  return (
    <div style={{ background: C.gold + "12", border: `1px solid ${C.gold}44`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 10, color: C.sage, marginBottom: 4 }}>試算合計{note ? `（${note}）` : ""}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.gold, fontFamily: "Georgia,serif" }}>${amount.toLocaleString()}</div>
    </div>
  );
}

export default function WageCalc() {
  const C = useTheme();
  const isWide = useIsWide();
  const [tab, setTab] = useState("外套師傅");

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

  const clearAll = () => {
    setJAddons({}); setButtonholes(""); setMilanHoles(""); setJExtra("");
    setTExtra(""); setMItem("二件式"); setMExtra("");
    setVestOpt(VEST_OPTIONS[0].key); setAlterQty({}); setAExtra("");
  };

  const chip = (on) => ({
    cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "9px 4px", flex: 1,
    border: `1px solid ${on ? C.gold : C.border}`,
    background: on ? C.gold + "22" : C.card, color: on ? C.gold : C.sage,
  });

  return (
    <div style={{ maxWidth: isWide ? 640 : 520, margin: "0 auto", padding: "14px 14px 80px" }}>
      <div style={{ fontSize: 11, color: C.sage, marginBottom: 10 }}>
        🧮 獨立試算工具：手動輸入勾選、即時計算，不寫入訂單或任何資料。
      </div>

      {/* 類型切換 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={chip(tab === t)}>{t}</button>
        ))}
      </div>

      {/* 外套師傅 */}
      {tab === "外套師傅" && (
        <>
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
          <Total amount={jacketTotal} />
        </>
      )}

      {/* 褲子師傅 */}
      {tab === "褲子師傅" && (
        <>
          <Sec title={`👖 褲子師傅（固定 $${TROUSER_BASE.toLocaleString()}）`}>
            <NumRow label="特殊加項（$）" value={tExtra} onChange={setTExtra} C={C} />
          </Sec>
          <Total amount={trouserTotal} />
        </>
      )}

      {/* 經理 */}
      {tab === "經理" && (
        <>
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
          <Total amount={managerTotal} note={mItem} />
        </>
      )}

      {/* 背心 */}
      {tab === "背心" && (
        <>
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
          <Total amount={vestTotal} />
        </>
      )}

      {/* 修改 */}
      {tab === "修改" && (
        <>
          <Sec title="✂️ 修改工資（輸入數量）">
            {ALTER_ITEMS.map(a => (
              <NumRow key={a.key} label={`${a.key}（×${a.add}）`} unit="次"
                value={alterQty[a.key] || ""} onChange={v => setAlterQty(p => ({ ...p, [a.key]: v }))} C={C} />
            ))}
            <NumRow label="特殊加項（$）" value={aExtra} onChange={setAExtra} C={C} />
          </Sec>
          <Total amount={alterTotal} />
        </>
      )}

      <button onClick={clearAll} style={{
        width: "100%", marginTop: 14, padding: "11px", borderRadius: 10,
        border: `1px solid ${C.border}`, background: "transparent", color: C.sage,
        fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}>🗑 全部歸零</button>
    </div>
  );
}
