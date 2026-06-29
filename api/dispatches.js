import { DB, queryDatabase, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const tailor  = req.query.tailor  || "";
    const orderId = req.query.orderId || "";
    let filter;
    if (orderId) {
      filter = { property: "訂單", relation: { contains: orderId } };
    } else if (tailor) {
      filter = { property: "指派師傅", select: { equals: tailor } };
    }
    const data = await queryDatabase(DB.dispatch, filter);
    const records = data.results.map(p => {
      const props = p.properties;
      const get = (f) => {
        const prop = props[f];
        if (!prop) return "";
        if (prop.type === "title") return prop.title[0]?.plain_text || "";
        if (prop.type === "rich_text") return prop.rich_text.map(t => t.plain_text).join("");
        if (prop.type === "select") return prop.select?.name || "";
        if (prop.type === "number") return prop.number;
        if (prop.type === "date") return prop.date?.start || "";
        if (prop.type === "checkbox") return prop.checkbox;
        if (prop.type === "unique_id") return `${prop.unique_id.prefix || ""}${prop.unique_id.number}`;
        if (prop.type === "relation") return prop.relation.map(r => r.id);
        return "";
      };
      return {
        id: p.id,
        url: p.url,
        name: get("派工單名稱"),
        no: get("派工單編號"),
        type: get("派工類型"),
        tailor: get("指派師傅"),
        deadline: get("完成期限"),
        status: get("狀態"),
        returnDate: get("送回日期"),
        wage: get("工資金額"),
        wageConfirmed: get("工資確認"),
        month: get("結算月份"),
        orderRel: get("訂單"),
      };
    });
    return res.status(200).json({ success: true, dispatches: records });
  } catch (err) {
    console.error("dispatches error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
