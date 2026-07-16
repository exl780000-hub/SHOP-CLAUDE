import { DB, queryDatabase, createPage, updatePage, archivePage, prop, cors, requireAuth, monthStr } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;

  // ── 工資試算紀錄（獨立資料庫，?calc=1 / action:"calc-*"）────────────────
  if (req.method === "GET" && req.query.calc) {
    try {
      const data = await queryDatabase(DB.wageCalc);
      const records = data.results.map(p => {
        const props = p.properties;
        return {
          id: p.id,
          name: props["名稱"]?.title?.[0]?.plain_text || "",
          type: props["類型"]?.select?.name || "",
          detail: props["明細"]?.rich_text?.map(t => t.plain_text).join("") || "",
          amount: props["金額"]?.number || 0,
          date: props["日期"]?.date?.start || "",
          settled: (props["狀態"]?.select?.name || "") === "已結算",
          settledAt: props["結算日期"]?.date?.start || null,
        };
      }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      return res.status(200).json({ success: true, records });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST" && String(req.body?.action || "").startsWith("calc-")) {
    try {
      const { action } = req.body;

      if (action === "calc-add") {
        const { name, type, detail, amount, date } = req.body;
        if (!name || amount == null) return res.status(400).json({ success: false, error: "參數不足" });
        const page = await createPage(DB.wageCalc, {
          "名稱": prop.title(name),
          "類型": prop.select(type),
          "明細": prop.text(detail || ""),
          "金額": prop.number(Number(amount)),
          "日期": prop.date(date || new Date().toISOString().slice(0, 10)),
          "狀態": prop.select("未結算"),
        });
        return res.status(200).json({ success: true, id: page.id });
      }

      if (action === "calc-settle") {
        const { ids, settled } = req.body;
        if (!ids?.length) return res.status(400).json({ success: false, error: "未指定紀錄" });
        const today = new Date().toISOString().slice(0, 10);
        await Promise.all(ids.map(id => updatePage(id, {
          "狀態": prop.select(settled ? "已結算" : "未結算"),
          "結算日期": settled ? prop.date(today) : prop.date(null),
        })));
        return res.status(200).json({ success: true, count: ids.length });
      }

      if (action === "calc-delete") {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, error: "未指定紀錄" });
        await archivePage(id);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: "未知 action" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

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

      // 各師傅是否已結算過（財務總表已有「{月} {師傅} 工資」記錄）
      const settledFinance = await queryDatabase(DB.finance, {
        and: [
          { property: "分類", select: { equals: "人事成本" } },
          { property: "結算月份", rich_text: { equals: month } },
        ],
      });
      const settledTailors = settledFinance.results
        .map(p => p.properties["項目名稱"]?.title?.[0]?.plain_text || "")
        .map(name => name.replace(`${month} `, "").replace(" 工資", ""))
        .filter(Boolean);

      return res.status(200).json({ success: true, month, byTailor: Object.values(byTailor), total, settledTailors });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST: 單一師傅結算，寫入財務總表
  if (req.method === "POST") {
    try {
      const { month, tailor, total } = req.body;
      if (!month || !tailor || total == null) return res.status(400).json({ success: false, error: "參數不足" });

      // 檢查該師傅本月是否已結算
      const existing = await queryDatabase(DB.finance, {
        and: [
          { property: "分類", select: { equals: "人事成本" } },
          { property: "結算月份", rich_text: { equals: month } },
        ],
      });
      const dup = existing.results.some(p =>
        (p.properties["項目名稱"]?.title?.[0]?.plain_text || "") === `${month} ${tailor} 工資`
      );
      if (dup) {
        return res.status(200).json({ success: false, error: `${month} ${tailor} 已結算過` });
      }

      const today = new Date().toISOString().slice(0, 10);
      await createPage(DB.finance, {
        "項目名稱": prop.title(`${month} ${tailor} 工資`),
        "類型": prop.select("💸 支出"),
        "分類": prop.select("人事成本"),
        "金額": prop.number(total),
        "帳戶": prop.select("🏦 銀行"),
        "付款狀態": prop.select("待收/待付"),
        "日期": prop.date(today),
        "結算月份": prop.text(month),
      });

      return res.status(200).json({ success: true, message: `${month} ${tailor} 工資 $${Number(total).toLocaleString()} 已結算` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
