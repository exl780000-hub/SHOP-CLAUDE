import { updatePage, prop, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { orderId, flow, status, jacketWage, trouserWage, managerFee } = req.body;
    const props = {};
    if (flow)   props["流程"]     = prop.select(flow);
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
