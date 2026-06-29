import { DB, queryDatabase, createPage, prop, cors, monthStr } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET: 預覽本月工資明細
  if (req.method === "GET") {
    try {
      const month = req.query.month || monthStr();
      const data = await queryDatabase(DB.dispatch, {
        and: [
          { property: "狀態", select: { equals: "✅ 完成" } },
          { property: "結算月份", rich_text: { equals: month } },
        ],
      });

      const items = data.results.map(p => {
        const props = p.properties;
        const get = (f) => {
          const prop = props[f];
          if (!prop) return "";
          if (prop.type === "title") return prop.title[0]?.plain_text || "";
          if (prop.type === "select") return prop.select?.name || "";
          if (prop.type === "number") return prop.number ?? 0;
          if (prop.type === "rich_text") return prop.rich_text.map(t => t.plain_text).join("");
          return "";
        };
        return {
          id: p.id,
          name: get("派工單名稱"),
          type: get("派工類型"),
          tailor: get("指派師傅"),
          wage: Number(get("工資金額")) || 0,
          wageConfirmed: props["工資確認"]?.checkbox || false,
        };
      }).filter(item => item.wage > 0);

      // 依師傅分組
      const byTailor = {};
      items.forEach(item => {
        if (!byTailor[item.tailor]) byTailor[item.tailor] = { tailor: item.tailor, total: 0, items: [] };
        byTailor[item.tailor].total += item.wage;
        byTailor[item.tailor].items.push(item);
      });

      const total = items.reduce((s, i) => s + i.wage, 0);
      return res.status(200).json({ success: true, month, byTailor: Object.values(byTailor), total });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST: 確認結算，寫入財務總表
  if (req.method === "POST") {
    try {
      const { month, tailors } = req.body;
      if (!month || !tailors?.length) return res.status(400).json({ success: false, error: "參數不足" });

      // 檢查是否已結算
      const existing = await queryDatabase(DB.finance, {
        and: [
          { property: "分類", select: { equals: "人事成本" } },
          { property: "結算月份", rich_text: { equals: month } },
        ],
      });
      if (existing.results.length > 0) {
        return res.status(200).json({ success: false, error: `${month} 工資已結算過` });
      }

      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(tailors.map(({ tailor, total }) =>
        createPage(DB.finance, {
          "項目名稱": prop.title(`${month} ${tailor} 工資`),
          "類型": prop.select("💸 支出"),
          "分類": prop.select("人事成本"),
          "金額": prop.number(total),
          "帳戶": prop.select("🏦 銀行"),
          "付款狀態": prop.select("待收/待付"),
          "日期": prop.date(today),
          "結算月份": prop.text(month),
        })
      ));

      return res.status(200).json({ success: true, message: `${month} 工資結算完成，共 ${tailors.length} 筆` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
