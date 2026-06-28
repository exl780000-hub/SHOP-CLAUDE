import { updatePage, prop, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { orderId, flow, status } = req.body;
    const props = {};
    if (flow)   props["流程"]     = prop.select(flow);
    if (status) props["訂單狀態"] = prop.select(status);

    await updatePage(orderId, props);
    return res.status(200).json({ success: true, message: "更新成功" });
  } catch (err) {
    console.error("update-order error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
