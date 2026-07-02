import { DB, queryDatabase, updatePage, prop, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    // action:"collect-balance"：標記尾款已收（合併自 collect-balance.js，節省 Vercel serverless function 額度）
    if (req.body.action === "collect-balance") {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ success: false, error: "orderId required" });

      const financeData = await queryDatabase(DB.finance, {
        and: [
          { property: "關聯訂單", relation: { contains: orderId } },
          { property: "付款狀態", select: { equals: "待收/待付" } },
        ],
      });

      if (financeData.results.length === 0) {
        return res.status(200).json({ success: false, error: "找不到待收款記錄（可能已收款）" });
      }

      await Promise.all(
        financeData.results.map(p =>
          updatePage(p.id, { "付款狀態": prop.select("已收/已付") })
        )
      );

      return res.status(200).json({ success: true, message: "尾款已標記為已收", count: financeData.results.length });
    }

    const { orderId, flow, status, jacketWage, trouserWage, managerFee } = req.body;
    const props = {};
    if (flow) {
      props["流程"] = prop.select(flow);
      props["流程更新時間"] = prop.date(new Date().toISOString().slice(0, 10));
    }
    if (status) props["訂單狀態"] = prop.select(status);
    if (jacketWage  != null) props["外套工資"] = prop.number(Number(jacketWage));
    if (trouserWage != null) props["褲子工資"] = prop.number(Number(trouserWage));
    if (managerFee  != null) props["經理費"]   = prop.number(Number(managerFee));
    // 重算合計
    if (jacketWage != null || trouserWage != null || managerFee != null) {
      const j = Number(jacketWage  ?? 0);
      const t = Number(trouserWage ?? 0);
      const m = Number(managerFee  ?? 0);
      props["師傅工資合計"] = prop.number(j + t + m);
    }

    await updatePage(orderId, props);
    return res.status(200).json({ success: true, message: "更新成功" });
  } catch (err) {
    console.error("update-order error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
