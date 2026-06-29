import { DB, queryDatabase, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

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

    return res.status(200).json({
      success: true,
      measurement: {
        data: getText("量身資料"),
        note: getText("體型備註"),
      },
    });
  } catch (err) {
    console.error("measurement error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
