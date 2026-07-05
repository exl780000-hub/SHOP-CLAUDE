import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { useIsWide } from "../useIsWide.js";

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

// 從 jacketStyle 文字（｜分隔）解析出加價項目
// 扣眼規則：前身（單排=扣數、預設2；雙排常見6扣2/6扣3=3顆）＋袖扣×雙手（袖3扣=6、袖4扣=8）；米蘭眼通常 1 顆
function parseJacketStyle(styleText = "") {
  const doubles = styleText.includes("雙排釦");
  const milan = styleText.includes("米蘭眼");
  const frontM = styleText.match(/(?:^|｜)扣(\d+)/);
  const sleeveM = styleText.match(/袖扣(\d+)/);
  const frontHoles = doubles ? 3 : (frontM ? parseInt(frontM[1]) : 2);
  const sleeveHoles = (sleeveM ? parseInt(sleeveM[1]) : 0) * 2;
  return {
    doubles,
    milan,
    ticket:      styleText.includes("票帶"),
    sword:       styleText.includes("劍領"),
    half:        styleText.includes("半裡"),
    full:        styleText.includes("全單"),
    overcoat:    styleText.includes("大衣"),
    buttonholes: frontHoles + sleeveHoles,
    milanHoles:  milan ? 1 : 0,
  };
}

// 從 trouserStyle 文字解析褲子特殊加項
function parseTrouserStyle(styleText = "") {
  const m = styleText.match(/特殊工資\$(\d+)/);
  return { extra: m ? parseInt(m[1]) : 0 };
}

function SaveBtn({ saving, dirty, onClick }) {
  const C = useTheme();
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
  const C = useTheme();
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
  const C = useTheme();
  const BASE = 7000;
  const parsed = parseJacketStyle(order.jacketStyle || "");
  const [doubles,     setDoubles]     = useState(parsed.doubles);
  const [milan,       setMilan]       = useState(parsed.milan);
  const [buttonholes, setButtonholes] = useState(parsed.buttonholes);
  const [milanHoles,  setMilanHoles]  = useState(parsed.milanHoles);
  const [ticket,      setTicket]      = useState(parsed.ticket);
  const [sword,       setSword]       = useState(parsed.sword);
  const [half,        setHalf]        = useState(parsed.half);
  const [full,        setFull]        = useState(parsed.full);
  const [overcoat,    setOvercoat]    = useState(parsed.overcoat);
  const [extra,       setExtra]       = useState(0);
  const [override,    setOverride]    = useState("");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

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
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {[
            { label: "扣眼 (×80)", val: buttonholes, set: setButtonholes, unit: 80 },
            { label: "米蘭眼 (×100)", val: milanHoles, set: setMilanHoles, unit: 100 },
          ].map(({ label, val, set, unit }) => (
            <div key={label} style={{ background: C.mid, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, color: C.sage, flex: 1 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" min="0" value={val} onChange={e => set(e.target.value)}
                  style={{ width: 64, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: "5px 8px", color: C.ivory, fontSize: 15, fontWeight: 700, outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: 11, color: C.sage }}>顆</span>
                {Number(val) > 0 && <span style={{ fontSize: 11, color: C.gold }}>+{(Number(val) * unit).toLocaleString()}</span>}
              </div>
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
            <span style={{ fontSize: 12, color: C.sage }}>自動計算</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${calcTotal.toLocaleString()}</span>
          </div>
          {savedWage > 0 && savedWage !== calcTotal && (
            <div style={{ fontSize: 11, color: C.blue, marginBottom: 6 }}>
              已儲存工資 ${savedWage.toLocaleString()}（與計算值不同，請確認）
            </div>
          )}
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>手動調整（留空 = 使用計算結果）</div>
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
  const C = useTheme();
  const BASE = 1900;
  const [extra, setExtra] = useState(parseTrouserStyle(order.trouserStyle || "").extra);
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
            <span style={{ fontSize: 12, color: C.sage }}>自動計算</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${calcTotal.toLocaleString()}</span>
          </div>
          {savedWage > 0 && savedWage !== calcTotal && (
            <div style={{ fontSize: 11, color: C.blue, marginBottom: 6 }}>
              已儲存工資 ${savedWage.toLocaleString()}（與計算值不同，請確認）
            </div>
          )}
          <div style={{ fontSize: 11, color: C.sage, marginBottom: 4 }}>手動調整（留空 = 使用計算結果）</div>
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
  const C = useTheme();
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
  const C = useTheme();
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
  const C = useTheme();
  const isWide = useIsWide();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchedOrderIds, setDispatchedOrderIds] = useState(null);

  const [timeMode, setTimeMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(monthStr(0));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tailor, setTailor] = useState("全部");
  const [dispatches, setDispatches] = useState([]);

  const loadOrders = async () => {
    try {
      const r = await fetch("/api/orders?q=");
      const d = await r.json();
      setOrders(d.orders || []);
    } catch (e) { console.error(e); }
  };

  const loadDispatches = async () => {
    try {
      const r = await fetch("/api/dispatches");
      const d = await r.json();
      setDispatches(d.dispatches || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOrders(), loadDispatches()]).finally(() => setLoading(false));
  }, []);

  const handleTailorChange = (t) => setTailor(t);

  // 師傅篩選：有該師傅派工單的訂單
  useEffect(() => {
    if (tailor === "全部") { setDispatchedOrderIds(null); return; }
    const ids = new Set(dispatches.filter(dp => dp.tailor === tailor).flatMap(dp => dp.orderRel || []));
    setDispatchedOrderIds(ids);
  }, [tailor, dispatches]);

  // 每筆訂單的派工單工資同步狀態
  const WAGE_DISPATCH_TYPES = { jacket: "👔 外套製作單", trouser: "👖 褲子製作單", manager: "📐 打版單" };
  const dispByOrder = {};
  dispatches.forEach(dp => {
    (dp.orderRel || []).forEach(oid => {
      if (!dispByOrder[oid]) dispByOrder[oid] = [];
      dispByOrder[oid].push(dp);
    });
  });
  const wageSyncStatus = (orderId) => {
    const list = dispByOrder[orderId] || [];
    const relevantTypes = tailor === "外套師傅" ? [WAGE_DISPATCH_TYPES.jacket]
      : tailor === "褲子師傅" ? [WAGE_DISPATCH_TYPES.trouser]
      : tailor === "經理" ? [WAGE_DISPATCH_TYPES.manager]
      : Object.values(WAGE_DISPATCH_TYPES);
    const relevant = list.filter(dp => relevantTypes.includes(dp.type));
    if (relevant.length === 0) return { key: "none", label: "❔ 尚未派工", color: C.border };
    return relevant.every(dp => dp.wageConfirmed)
      ? { key: "ok", label: "✅ 已確認可月結", color: C.green }
      : { key: "pending", label: "⚠️ 工資未確認", color: C.gold };
  };

  const handleSaved = (orderId, updated) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    loadDispatches(); // 儲存會同步派工單工資，重抓確認狀態
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

  const renderCard = (o) => {
    if (tailor === "外套師傅") return <JacketWageCard key={o.id} order={o} onSaved={handleSaved} />;
    if (tailor === "褲子師傅") return <TrouserWageCard key={o.id} order={o} onSaved={handleSaved} />;
    if (tailor === "經理")    return <ManagerFeeCard key={o.id} order={o} onSaved={handleSaved} />;
    return <FullWageCard key={o.id} order={o} onSaved={handleSaved} />;
  };

  return (
    <div style={{ maxWidth: isWide?900:520, margin: "0 auto", padding: "14px 14px 80px" }}>

      {/* 時間篩選 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 10 }}>📅 時間篩選</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[{ key: "month", label: "月份", color: C.gold }, { key: "custom", label: "自訂區間", color: C.blue }].map(({ key, label, color }) => (
            <button key={key} onClick={() => setTimeMode(key)} style={{
              flex: 1, cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 600, padding: "9px 0",
              border: `1px solid ${timeMode === key ? color : C.border}`,
              background: timeMode === key ? color + "22" : C.mid,
              color: timeMode === key ? color : C.sage,
            }}>{label}</button>
          ))}
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

      {/* 分區：待計算在上、已確認在下，一眼分清楚 */}
      {[
        { key: "pending", title: "⚠️ 待計算／未確認", color: C.gold,  list: filtered.filter(o => wageSyncStatus(o.id).key !== "ok") },
        { key: "done",    title: "✅ 已確認可月結",   color: C.green, list: filtered.filter(o => wageSyncStatus(o.id).key === "ok") },
      ].map(sec => sec.list.length === 0 ? null : (
        <div key={sec.key} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: sec.color, marginBottom: 8, letterSpacing: "0.05em" }}>
            {sec.title}（{sec.list.length}）
          </div>
          <div style={isWide ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 12, alignItems: "start" } : undefined}>
            {sec.list.map(o => {
              const st = wageSyncStatus(o.id);
              return (
                <div key={o.id} style={{ opacity: sec.key === "done" ? 0.8 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.color + "18",
                      border: `1px solid ${st.color}44`, borderRadius: 10, padding: "1px 8px" }}>{st.label}</span>
                  </div>
                  {renderCard(o)}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 修改單／背心單工資（不在訂單工資欄位內，直接填在派工單上） */}
      <ExtraDispatchWages dispatches={dispatches} tailor={tailor} orders={orders} onSaved={loadDispatches} />

      {/* 師傅工資月結 */}
      <div style={{ marginTop: 18 }}>
        <WageSettlement month={timeMode === "month" ? selectedMonth : monthStr(0)} />
      </div>
    </div>
  );
}

// ─── 修改單／背心單工資 ────────────────────────────────────────────────────────
const EXTRA_WAGE_TYPES = ["✂️ 外套修改單", "✂️ 褲子修改單", "🦺 背心製作單"];
const EXTRA_WAGE_HINT = {
  "🦺 背心製作單": "背心：褲師傅1900／外套師傅單排2200、雙排2500",
  "✂️ 外套修改單": "肩領300、袖子200、腰身250、袖長單手80/雙手160",
  "✂️ 褲子修改單": "腰身250、褲長100、褲腳100、褲管150、臀圍200",
};

function ExtraDispatchWages({ dispatches, tailor, orders, onSaved }) {
  const C = useTheme();
  const [editVals, setEditVals] = useState({});
  const [savingId, setSavingId] = useState(null);

  const orderName = (oid) => orders.find(o => o.id === oid)?.name || "";
  const list = dispatches.filter(dp =>
    EXTRA_WAGE_TYPES.includes(dp.type) && (tailor === "全部" || dp.tailor === tailor)
  );
  if (list.length === 0) return null;

  const save = async (dp) => {
    const wage = editVals[dp.id];
    if (wage == null || wage === "") return;
    setSavingId(dp.id);
    try {
      const r = await fetch("/api/update-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId: dp.id, wage: Number(wage), wageConfirmed: true, month: new Date().toISOString().slice(0, 7) }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setEditVals(p => { const n = { ...p }; delete n[dp.id]; return n; });
      onSaved();
    } catch (e) { alert("儲存失敗：" + e.message); }
    setSavingId(null);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginTop: 18, boxShadow: C.shadowCard }}>
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 4 }}>✂️ 修改單／背心單工資</div>
      <div style={{ fontSize: 10, color: C.sage, marginBottom: 10 }}>這些工資直接記在派工單上，會一起進月結</div>
      {list.map(dp => {
        const val = editVals[dp.id] ?? (dp.wage || "");
        const dirty = editVals[dp.id] != null && String(editVals[dp.id]) !== String(dp.wage || "");
        return (
          <div key={dp.id} style={{ borderBottom: `1px solid ${C.border}44`, padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ivory, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {dp.type}｜{orderName(dp.orderRel?.[0]) || dp.name}
                </div>
                <div style={{ fontSize: 10, color: C.sage, marginTop: 2 }}>
                  {dp.tailor}・{dp.status}{dp.wageConfirmed ? "・✅ 已確認" : ""}
                </div>
              </div>
              <input type="number" value={val} placeholder="工資"
                onChange={e => setEditVals(p => ({ ...p, [dp.id]: e.target.value }))}
                style={{ width: 90, background: C.mid, border: `1px solid ${dirty ? C.gold : C.border}`, borderRadius: 8,
                  padding: "7px 10px", color: C.gold, fontSize: 14, fontWeight: 700, outline: "none", textAlign: "right" }} />
              {dirty && (
                <button onClick={() => save(dp)} disabled={savingId === dp.id} style={{
                  background: savingId === dp.id ? C.mid : C.green, color: savingId === dp.id ? C.sage : "#fff",
                  border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>{savingId === dp.id ? "…" : "存"}</button>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.border, marginTop: 3 }}>{EXTRA_WAGE_HINT[dp.type]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 師傅工資月結（自月報表頁搬移至此） ────────────────────────────────────────
function WageSettlement({ month }) {
  const C = useTheme();
  const [data, setData] = useState(null);
  const [loadingWS, setLoadingWS] = useState(false);
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoadingWS(true); setResult(null);
    try {
      const r = await fetch(`/api/wage-settlement?month=${month}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { console.error(e); }
    setLoadingWS(false);
  };

  const settle = async () => {
    if (!data?.byTailor?.length) return;
    setSettling(true);
    try {
      const r = await fetch("/api/wage-settlement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, tailors: data.byTailor.map(t => ({ tailor: t.tailor, total: t.total })) }),
      });
      const d = await r.json();
      setResult({ ok: d.success, msg: d.success ? d.message : d.error });
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setSettling(false);
  };

  if (!data && !loadingWS) {
    return (
      <button onClick={load} style={{ width: "100%", padding: "12px", borderRadius: 10,
        border: `1px solid ${C.border}`, background: "transparent", color: C.sage, fontSize: 13,
        fontWeight: 600, cursor: "pointer" }}>🧾 載入 {month} 工資月結預覽</button>
    );
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: C.shadowCard }}>
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 12 }}>🧾 師傅工資月結（{month}）</div>
      {loadingWS && <div style={{ color: C.sage, fontSize: 13 }}>載入中...</div>}
      {data && !loadingWS && (
        <>
          {data.byTailor.length === 0 ? (
            <div style={{ color: C.sage, fontSize: 13 }}>本月無已完成且確認工資的派工單</div>
          ) : (
            <>
              {data.byTailor.map(t => (
                <div key={t.tailor} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>{t.tailor}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${t.total.toLocaleString()}</span>
                  </div>
                  {t.items.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderLeft: `2px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, color: C.sage }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: C.ivory }}>${item.wage.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${C.border}`, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ivory }}>工資合計</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "Georgia,serif" }}>${data.total.toLocaleString()}</span>
              </div>
              {result && (
                <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8,
                  background: (result.ok ? C.green : C.red) + "22", fontSize: 12, fontWeight: 700,
                  color: result.ok ? C.green : C.red }}>
                  {result.ok ? "✅ " : "❌ "}{result.msg}
                </div>
              )}
              {!result?.ok && (
                <button onClick={settle} disabled={settling} style={{ width: "100%", padding: "10px",
                  borderRadius: 8, border: "none", background: settling ? C.mid : C.green,
                  color: settling ? C.sage : "#fff", fontSize: 13, fontWeight: 700, cursor: settling ? "default" : "pointer" }}>
                  {settling ? "結算中..." : `確認結算 ${month}`}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
