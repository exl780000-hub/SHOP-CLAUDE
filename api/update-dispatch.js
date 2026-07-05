import { DB, queryDatabase, updatePage, prop, cors } from "./_notion.js";

// 當某一組派工單全部完成，自動推進訂單至對應流程
const FLOW_GROUPS = [
  { types: ["📐 打版單"],                                        target: "🪡 製作毛胚" },
  { types: ["🧵 毛胚製作單"],                                    target: "✂️ 開始製作" }, // 跳過第一次試穿
  { types: ["👔 外套製作單", "👖 褲子製作單", "🦺 背心製作單"], target: "🧍 第二試身" }, // 待二次試穿
  { types: ["✂️ 外套修改單", "✂️ 褲子修改單"],                  target: "🎉 完成訂單" }, // 成品製作完成
];

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { dispatchId, status, returnDate, deadline, wage, wageConfirmed, month, orderId, dispatchType } = req.body;

    const props = {};
    if (status) props["狀態"] = prop.select(status);
    if (returnDate) props["送回日期"] = prop.date(returnDate);
    if (deadline) props["完成期限"] = prop.date(deadline);
    if (wage != null && wage !== "") props["工資金額"] = prop.number(Number(wage));
    if (wageConfirmed != null) props["工資確認"] = prop.checkbox(wageConfirmed);
    if (month) props["結算月份"] = prop.text(month);

    await updatePage(dispatchId, props);

    // 自動推進訂單流程
    let flowAdvanced = null;
    if (status === "✅ 完成" && orderId && dispatchType) {
      const group = FLOW_GROUPS.find(g => g.types.includes(dispatchType));
      if (group) {
        const allDispatches = await queryDatabase(DB.dispatch, {
          property: "訂單",
          relation: { contains: orderId },
        });

        // 篩出同一組別的派工單
        const relevant = allDispatches.results.filter(p =>
          group.types.includes(p.properties["派工類型"]?.select?.name || "")
        );

        // 全部完成（剛標記的那筆用 dispatchId 比對）
        const allDone = relevant.length > 0 && relevant.every(p =>
          p.properties["狀態"]?.select?.name === "✅ 完成" || p.id === dispatchId
        );

        if (allDone) {
          const today = new Date().toISOString().slice(0, 10);
          await updatePage(orderId, { "流程": prop.select(group.target), "流程更新時間": prop.date(today) });
          flowAdvanced = group.target;
        }
      }
    }

    return res.status(200).json({ success: true, message: "更新成功", flowAdvanced });
  } catch (err) {
    console.error("update-dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
