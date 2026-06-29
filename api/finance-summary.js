import { DB, queryDatabase, cors, monthStr } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const month = req.query.month || monthStr();

    const data = await queryDatabase(DB.finance, {
      property: "結算月份",
      rich_text: { equals: month },
    });

    let income = 0, expense = 0;
    let pendingIn = 0, pendingOut = 0;
    const pendingList = [];
    const wageItems = [];

    for (const p of data.results) {
      const props = p.properties;
      const getText = (f) => {
        const prop = props[f];
        if (!prop) return "";
        if (prop.type === "title") return prop.title[0]?.plain_text || "";
        if (prop.type === "rich_text") return prop.rich_text.map(t => t.plain_text).join("") || "";
        if (prop.type === "select") return prop.select?.name || "";
        if (prop.type === "number") return prop.number ?? 0;
        return "";
      };

      const type = getText("類型");
      const amount = Number(getText("金額")) || 0;
      const payStatus = getText("付款狀態");
      const name = getText("項目名稱");
      const category = getText("分類");
      const date = props["日期"]?.date?.start || "";

      if (type === "💵 收入") income += amount;
      else if (type === "💸 支出") expense += amount;

      if (payStatus === "待收/待付") {
        if (type === "💵 收入") { pendingIn += amount; pendingList.push({ name, amount, type: "收", date }); }
        else { pendingOut += amount; pendingList.push({ name, amount, type: "付", date }); }
      }

      if (category === "人事成本" || (category === "固定成本" && name.includes("師傅"))) {
        wageItems.push({ name, amount });
      }
    }

    return res.status(200).json({
      success: true,
      month,
      income,
      expense,
      profit: income - expense,
      pendingIn,
      pendingOut,
      pendingList: pendingList.sort((a, b) => (b.date > a.date ? 1 : -1)),
      wageItems,
    });
  } catch (err) {
    console.error("finance-summary error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
