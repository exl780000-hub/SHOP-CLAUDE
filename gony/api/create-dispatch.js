import { DB, createPage, prop, cors } from "./_notion.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { orderId, orderName, dispatchType, tailor, deadline, content } = req.body;

    const dispatchProps = {
      "派工單名稱": prop.title(`${orderName} - ${dispatchType}`),
      "訂單": prop.relation(orderId),
      "派工類型": prop.select(dispatchType),
      "指派師傅": prop.select(tailor),
      "狀態": prop.select("⏳ 待完成"),
      ...(deadline ? { "完成期限": prop.date(deadline) } : {}),
      ...(content ? { "備註": prop.text(content) } : {}),
    };

    const dispatch = await createPage(DB.dispatch, dispatchProps);

    return res.status(200).json({
      success: true,
      dispatchId: dispatch.id,
      dispatchUrl: dispatch.url,
      message: "派工單建立成功",
    });
  } catch (err) {
    console.error("dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
