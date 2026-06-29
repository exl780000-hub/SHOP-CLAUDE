import { DB, queryDatabase, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const q = (req.query.q || "").trim();
    const data = await queryDatabase(DB.order);

    const orders = data.results.map(p => {
      const props = p.properties;
      const getText = (f) => {
        const prop = props[f];
        if (!prop) return "";
        if (prop.type === "title") return (prop.title[0]?.plain_text) || "";
        if (prop.type === "rich_text") return (prop.rich_text.map(t => t.plain_text).join("")) || "";
        if (prop.type === "select") return prop.select?.name || "";
        if (prop.type === "multi_select") return prop.multi_select.map(s => s.name).join("、");
        if (prop.type === "number") return prop.number;
        if (prop.type === "unique_id") return `${prop.unique_id.prefix || ""}${prop.unique_id.number}`;
        if (prop.type === "date") return prop.date?.start || "";
        return "";
      };
      return {
        id: p.id,
        url: p.url,
        name: getText("訂單名稱"),
        orderNo: getText("訂單編號"),
        items: getText("品項"),
        status: getText("訂單狀態"),
        flow: getText("流程"),
        date: getText("訂單日期"),
        actualPrice: getText("實際售價"),
        suggestedPrice: getText("建議售價"),
        deposit: getText("訂金"),
        jacketWage: getText("外套工資"),
        trouserWage: getText("褲子工資"),
        managerFee: getText("經理費"),
        totalWage: getText("師傅工資合計"),
        jacketStyle: getText("外套樣式"),
        trouserStyle: getText("褲子樣式"),
        vestStyle: getText("背心樣式"),
        shirtStyle: getText("襯衫樣式"),
      };
    });

    const filtered = q
      ? orders.filter(o => o.name.includes(q) || String(o.orderNo).includes(q))
      : orders;

    return res.status(200).json({ success: true, orders: filtered });
  } catch (err) {
    console.error("orders error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
