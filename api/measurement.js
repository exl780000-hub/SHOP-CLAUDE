import { DB, queryDatabase, cors, requireAuth } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ success: false, error: "orderId required" });

  try {
    const data = await queryDatabase(DB.measurement, {
      property: "訂單",
      relation: { contains: orderId },
    });

    if (data.results.length === 0) {
      return res.status(200).json({ success: true, measurement: null });
    }

    const props = data.results[0].properties;
    const getText = (f) => props[f]?.rich_text?.map(t => t.plain_text).join("") || "";

    // 尺寸實際存在各自的數字欄位，組合成可讀文字
    const NUM_FIELDS = [
      "胸圍", "腰圍", "臀圍", "肩寬", "前胸寬", "後背寬", "手腕圍", "頸圍",
      "袖長", "外套衣長", "背長", "褲長", "股上", "大腿圍", "膝圍", "腳口", "身高", "體重",
    ];
    const sizeData = NUM_FIELDS
      .filter(f => props[f]?.number != null)
      .map(f => `${f}：${props[f].number}`)
      .join("\n");

    return res.status(200).json({
      success: true,
      measurement: {
        data: sizeData,
        note: getText("體型備註"),
        traits: getText("體型特徵"),
        sizeNote: getText("量身備註"),
      },
    });
  } catch (err) {
    console.error("measurement error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
