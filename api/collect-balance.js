import { DB, queryDatabase, updatePage, prop, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: "orderId required" });

    // 找到此訂單對應的財務「訂單收入」記錄（付款狀態 = 待收/待付）
    const financeData = await queryDatabase(DB.finance, {
      and: [
        { property: "關聯訂單", relation: { contains: orderId } },
        { property: "付款狀態", select: { equals: "待收/待付" } },
      ],
    });

    if (financeData.results.length === 0) {
      return res.status(200).json({ success: false, error: "找不到待收款記錄（可能已收款）" });
    }

    // 更新所有關聯記錄為已收
    await Promise.all(
      financeData.results.map(p =>
        updatePage(p.id, { "付款狀態": prop.select("已收/已付") })
      )
    );

    return res.status(200).json({ success: true, message: "尾款已標記為已收", count: financeData.results.length });
  } catch (err) {
    console.error("collect-balance error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
