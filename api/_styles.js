// 把卡片的樣式選項整理成可讀文字
// card.partStyles[part][category] = [selected options]
// card.partInputs[part][key] = value

function formatPart(card, part) {
  const styles = (card.partStyles && card.partStyles[part]) || {};
  const inputs = (card.partInputs && card.partInputs[part]) || {};
  const segments = [];

  for (const [cat, opts] of Object.entries(styles)) {
    if (!opts || opts.length === 0) continue;
    segments.push(opts.join("/"));
  }

  // 附帶數字輸入
  const inputLabels = {
    "排扣扣數": "扣", "領寬": "領寬", "袖口扣數": "袖扣",
    "腰頭扣數": "甩腰扣", "背心排扣扣數": "扣",
    "克夫寬": "克夫", "袖扣數": "袖扣", "袖深加深": "袖深",
  };
  for (const [key, val] of Object.entries(inputs)) {
    if (val) segments.push(`${inputLabels[key] || key}${val}`);
  }

  return segments.join("｜");
}

// 回傳 { 外套樣式, 褲子樣式, 背心樣式, 襯衫樣式 }
export function buildStyleTexts(cards) {
  const result = { 外套樣式: [], 褲子樣式: [], 背心樣式: [], 襯衫樣式: [] };
  const partToField = { 外套: "外套樣式", 褲子: "褲子樣式", 背心: "背心樣式", 襯衫: "襯衫樣式" };
  const itemParts = {
    "二件式": ["外套", "褲子"],
    "三件式": ["外套", "褲子", "背心"],
    "外套": ["外套"], "褲子": ["褲子"], "背心": ["背心"], "襯衫": ["襯衫"],
  };

  const counters = {};
  cards.forEach(card => {
    const parts = itemParts[card.type] || [];
    parts.forEach(part => {
      const field = partToField[part];
      if (!field) return;
      const text = formatPart(card, part);
      counters[part] = (counters[part] || 0) + 1;
      const note = card.note ? `（備註:${card.note}）` : "";
      const emb = card.embroidery ? `（繡名:${card.embroidery}）` : "";
      result[field].push(text + note + emb);
    });
  });

  return {
    外套樣式: result.外套樣式.join("\n"),
    褲子樣式: result.褲子樣式.join("\n"),
    背心樣式: result.背心樣式.join("\n"),
    襯衫樣式: result.襯衫樣式.join("\n"),
  };
}

// 工資計算
export function calcWages(cards) {
  const jacket = cards.reduce((s, c) => {
    if (!["二件式", "三件式", "外套"].includes(c.type)) return s;
    const ps = (c.partStyles && c.partStyles["外套"]) || {};
    let w = 7000;
    if ((ps["排扣"] || []).includes("雙排釦")) w += 600;
    if ((ps["領型"] || []).includes("劍領")) w += 300;
    if ((ps["眼型"] || []).includes("米蘭眼")) w += 100;
    return s + w;
  }, 0);
  const trouser = cards.reduce((s, c) =>
    ["二件式", "三件式", "褲子"].includes(c.type) ? s + 1900 : s, 0);
  const manager = cards.reduce((s, c) => {
    const m = { "二件式": 2000, "三件式": 2400, "外套": 1600, "褲子": 400, "背心": 0, "襯衫": 200 };
    return s + (m[c.type] || 0);
  }, 0);
  return { jacket, trouser, manager, total: jacket + trouser + manager };
}
