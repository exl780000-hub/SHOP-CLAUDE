import { updatePage, prop, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { dispatchId, status, returnDate, wage, wageConfirmed, month } = req.body;
    const props = {};
    if (status) props["狀態"] = prop.select(status);
    if (returnDate) props["送回日期"] = prop.date(returnDate);
    if (wage != null && wage !== "") props["工資金額"] = prop.number(wage);
    if (wageConfirmed != null) props["工資確認"] = prop.checkbox(wageConfirmed);
    if (month) props["結算月份"] = prop.text(month);

    await updatePage(dispatchId, props);
    return res.status(200).json({ success: true, message: "更新成功" });
  } catch (err) {
    console.error("update-dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
