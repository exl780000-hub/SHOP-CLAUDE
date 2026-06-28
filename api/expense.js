import { DB, createPage, queryDatabase, prop, cors, monthStr } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { action } = req.body;

    // 產生本月固定成本
    if (action === "fixed-cost") {
      const month = monthStr();
      // 檢查是否已存在
      const existing = await queryDatabase(DB.finance, {
        and: [
          { property: "分類", select: { equals: "固定成本" } },
          { property: "結算月份", rich_text: { equals: month } },
        ],
      });
      if (existing.results.length > 0) {
        return res.status(200).json({ success: false, error: `${month} 固定成本已存在` });
      }
      await createPage(DB.finance, {
        "項目名稱": prop.title(`${month} 固定成本`),
        "類型": prop.select("💸 支出"),
        "分類": prop.select("固定成本"),
        "金額": prop.number(97649),
        "帳戶": prop.select("🏦 銀行"),
        "付款狀態": prop.select("已收/已付"),
        "日期": prop.date(new Date().toISOString().slice(0, 10)),
        "結算月份": prop.text(month),
      });
      return res.status(200).json({ success: true, message: `${month} 固定成本已產生 $97,649` });
    }

    // 一般記帳
    const { type, account, category, amount, name, payStatus, date, note } = req.body;
    const today = date || new Date().toISOString().slice(0, 10);
    const month = monthStr(new Date(today));

    await createPage(DB.finance, {
      "項目名稱": prop.title(name || category),
      "類型": prop.select(type || "💸 支出"),
      "分類": prop.select(category),
      "帳戶": prop.select(account),
      "金額": prop.number(amount),
      "付款狀態": prop.select(payStatus || "已收/已付"),
      "日期": prop.date(today),
      "結算月份": prop.text(month),
      ...(note ? { "備註": prop.text(note) } : {}),
    });

    return res.status(200).json({ success: true, message: "記帳成功" });
  } catch (err) {
    console.error("expense error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
