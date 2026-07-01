import { DB, queryDatabase, cors } from "./_notion.js";

// 依電話查詢客戶是否為回頭客，回傳過去訂單 + 最近一筆量身紀錄摘要
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const phone = (req.query.phone || "").trim();
    if (!phone) return res.status(200).json({ success: true, isReturning: false });

    const customerResult = await queryDatabase(DB.customer, {
      property: "電話", phone_number: { equals: phone },
    });
    if (customerResult.results.length === 0) {
      return res.status(200).json({ success: true, isReturning: false });
    }
    const customerId = customerResult.results[0].id;

    const ordersResult = await queryDatabase(DB.order, {
      property: "客戶", relation: { contains: customerId },
    });
    const pastOrders = ordersResult.results
      .map(p => ({
        name: p.properties["訂單名稱"]?.title?.[0]?.plain_text || "",
        date: p.properties["訂單日期"]?.date?.start || "",
        items: (p.properties["品項"]?.multi_select || []).map(s => s.name).join("、"),
      }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const measResult = await queryDatabase(DB.measurement, {
      property: "客戶", relation: { contains: customerId },
    });
    const latestMeas = measResult.results
      .sort((a, b) => (b.properties["量身日期"]?.date?.start || "").localeCompare(a.properties["量身日期"]?.date?.start || ""))[0];

    return res.status(200).json({
      success: true,
      isReturning: pastOrders.length > 0,
      orderCount: pastOrders.length,
      pastOrders: pastOrders.slice(0, 5),
      latestMeasurement: latestMeas ? {
        date: latestMeas.properties["量身日期"]?.date?.start || "",
        traits: latestMeas.properties["體型特徵"]?.rich_text?.[0]?.plain_text || "",
        note: latestMeas.properties["體型備註"]?.rich_text?.[0]?.plain_text || "",
      } : null,
    });
  } catch (err) {
    console.error("customer-history error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
