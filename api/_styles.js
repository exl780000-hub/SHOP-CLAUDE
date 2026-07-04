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
    "特殊工資": "特殊工資$",
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

// 工資計算（論件，完成後可手動微調）
export function calcWages(cards) {
  const MANAGER_FEE = { "二件式": 2000, "三件式": 2400, "外套": 1600, "褲子": 400, "背心": 400, "襯衫": 200 };
  const PATTERN_FEE = { "二件式": 4500, "三件式": 5800, "外套": 3200, "褲子": 1300, "背心": 1300, "襯衫": 0 };

  let jacket = 0, trouser = 0, vest = 0, manager = 0;

  cards.forEach(c => {
    const ps  = (c.partStyles?.["外套"]) || {};
    const pi  = (c.partInputs?.["外套"])  || {};
    const pti = (c.partInputs?.["褲子"])  || {};
    const pvs = (c.partStyles?.["背心"]) || {};

    // 外套師傅工資
    if (["二件式", "三件式", "外套"].includes(c.type)) {
      let w = 7000;
      const doubles = (ps["排扣"] || []).includes("雙排釦");
      // 扣眼數：前身（單排=扣數、預設2；雙排常見6扣2/6扣3=3顆）＋袖扣×雙手（袖3扣=6、袖4扣=8）
      const frontHoles  = doubles ? 3 : (parseInt(pi["排扣扣數"]) || 2);
      const sleeveHoles = (parseInt(pi["袖口扣數"]) || 0) * 2;
      w += (frontHoles + sleeveHoles) * 80;                             // 扣眼 80/顆
      if (doubles) w += 600;                                            // 雙排
      if ((ps["眼型"] || []).includes("米蘭眼")) w += 100;              // 米蘭眼通常 1 顆 100
      if ((ps["特殊"] || []).includes("票帶")) w += 100;
      if ((ps["領型"] || []).includes("劍領")) w += 300;
      if ((ps["特殊"] || []).includes("半裡")) w += 300;
      if ((ps["特殊"] || []).includes("全單")) w += 600;
      if ((ps["特殊"] || []).includes("大衣")) w += 1500;
      jacket += w;
    }

    // 褲子師傅工資
    if (["二件式", "三件式", "褲子"].includes(c.type)) {
      trouser += 1900 + (parseInt(pti["特殊工資"]) || 0);
    }

    // 背心工資（預設褲子師傅 1900；外套師傅單排 2200/雙排 2500）
    if (["三件式", "背心"].includes(c.type)) {
      vest += (pvs["排扣"] || []).includes("雙排釦") ? 2500 : 1900;
    }

    // 經理費 + 打板費（同一人）
    manager += (MANAGER_FEE[c.type] || 0) + (PATTERN_FEE[c.type] || 0);
  });

  return { jacket, trouser, vest, manager, total: jacket + trouser + vest + manager };
}
