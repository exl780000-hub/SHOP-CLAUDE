import { DB, queryDatabase, createPage, updatePage, getPage, prop, cors } from "./_notion.js";

// 建立派工單時對應的訂單流程狀態
const DISPATCH_FLOW = {
  "📐 打版單":    "📐 打版",
  "🧵 毛胚製作單": "🪡 製作毛胚",
  "👔 外套製作單": "✂️ 開始製作",
  "👖 褲子製作單": "✂️ 開始製作",
  "🦺 背心製作單": "✂️ 開始製作",
  "✂️ 外套修改單": "🪢 最後縫製",
  "✂️ 褲子修改單": "🪢 最後縫製",
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { orderId, orderName, dispatchType, tailor, deadline, content } = req.body;

    let finalContent = content || "";
    let referencePhotos = [];

    // 打版單：自動附上量身資料、體型特徵、款式/體型照片
    if (dispatchType === "📐 打版單" && orderId) {
      try {
        const measResult = await queryDatabase(DB.measurement, {
          property: "訂單",
          relation: { contains: orderId },
        });
        if (measResult.results.length > 0) {
          const measPage = measResult.results[0];
          const measText = measPage.properties["量身資料"]?.rich_text?.[0]?.plain_text || "";
          const traitsText = measPage.properties["體型特徵"]?.rich_text?.[0]?.plain_text || "";
          const measNote = measPage.properties["體型備註"]?.rich_text?.[0]?.plain_text || "";
          const measBlock = [
            measText ? `\n\n【量身尺寸】\n${measText}` : "",
            traitsText ? `\n\n【體型特徵】\n${traitsText}` : "",
            measNote ? `\n\n【體型備註】\n${measNote}` : "",
          ].join("");
          finalContent = finalContent + measBlock;
        }
      } catch (e) {
        console.warn("fetch measurement failed:", e.message);
      }

      try {
        const orderPage = await getPage(orderId);
        const stylePhotoText = orderPage.properties["款式參考圖"]?.rich_text?.[0]?.plain_text || "";
        const bodyPhotoText = orderPage.properties["身材照片"]?.rich_text?.[0]?.plain_text || "";
        referencePhotos = [
          ...(stylePhotoText ? stylePhotoText.split("\n").filter(Boolean) : []),
          ...(bodyPhotoText ? bodyPhotoText.split("\n").filter(Boolean) : []),
        ];
      } catch (e) {
        console.warn("fetch order photos failed:", e.message);
      }
    }

    const dispatchProps = {
      "派工單名稱": prop.title(`${orderName} - ${dispatchType}`),
      "訂單": prop.relation(orderId),
      "派工類型": prop.select(dispatchType),
      "指派師傅": prop.select(tailor),
      "狀態": prop.select("⏳ 待完成"),
      ...(deadline ? { "完成期限": prop.date(deadline) } : {}),
      ...(finalContent ? { "備註": prop.text(finalContent.slice(0, 2000)) } : {}),
      ...(referencePhotos.length ? { "參考照片": prop.files(referencePhotos) } : {}),
    };

    const dispatch = await createPage(DB.dispatch, dispatchProps);

    // 同步更新訂單流程
    const flowTarget = DISPATCH_FLOW[dispatchType];
    if (flowTarget && orderId) {
      try {
        await updatePage(orderId, { "流程": prop.select(flowTarget) });
      } catch (e) {
        console.warn("update order flow failed:", e.message);
      }
    }

    return res.status(200).json({
      success: true,
      dispatchId: dispatch.id,
      dispatchUrl: dispatch.url,
      flowUpdated: flowTarget || null,
      message: "派工單建立成功",
    });
  } catch (err) {
    console.error("dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
