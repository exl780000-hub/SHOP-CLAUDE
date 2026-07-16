import { DB, queryDatabase, updatePage, prop, cors, requireAuth } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
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

    // 工資同步派工單：訂單工資 → 對應派工單的工資金額＋工資確認（月結讀派工單，避免兩套數字）
    const synced = [];
    const missing = [];
    if (jacketWage != null || trouserWage != null || managerFee != null) {
      const WAGE_TO_DISPATCH = [
        { wage: jacketWage,  types: ["👔 外套製作單"], label: "外套" },
        { wage: trouserWage, types: ["👖 褲子製作單"], label: "褲子" },
        { wage: managerFee,  types: ["📐 打版單"],     label: "經理" },
      ];
      try {
        const dispatchData = await queryDatabase(DB.dispatch, {
          property: "訂單", relation: { contains: orderId },
        });
        const month = new Date().toISOString().slice(0, 7);
        for (const { wage, types, label } of WAGE_TO_DISPATCH) {
          if (wage == null) continue;
          const targets = dispatchData.results.filter(p => types.includes(p.properties["派工類型"]?.select?.name || ""));
          if (targets.length === 0) { missing.push(label); continue; }
          for (const t of targets) {
            const existingMonth = t.properties["結算月份"]?.rich_text?.[0]?.plain_text || "";
            await updatePage(t.id, {
              "工資金額": prop.number(Number(wage)),
              "工資確認": prop.checkbox(true),
              ...(existingMonth ? {} : { "結算月份": prop.text(month) }),
            });
            synced.push(label);
          }
        }
      } catch (e) {
        console.warn("wage dispatch sync failed:", e.message);
      }
    }

    return res.status(200).json({ success: true, message: "更新成功", syncedDispatches: synced, missingDispatches: missing });
  } catch (err) {
    console.error("update-order error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
