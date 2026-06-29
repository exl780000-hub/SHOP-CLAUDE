import { DB, queryDatabase, createPage, prop, cors, monthStr } from "./_notion.js";
import { buildStyleTexts, calcWages } from "./_styles.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { customer, cards, measurements, shirtMeasurements, measNote, deposit, totalActual, totalSuggested, stylePhotoUrls, bodyPhotoUrls } = req.body;

    // 1. 找/建客戶
    let customerId = null;
    const found = await queryDatabase(DB.customer, {
      property: "電話", phone_number: { equals: customer.phone }
    });
    if (found.results.length > 0) {
      customerId = found.results[0].id;
    } else {
      const newC = await createPage(DB.customer, {
        "客戶姓名": prop.title(customer.name),
        "電話": prop.phone(customer.phone),
        ...(customer.gender ? { "性別": prop.select(customer.gender) } : {}),
        ...(customer.source ? { "來源": prop.select(customer.source) } : {}),
      });
      customerId = newC.id;
    }

    // 2. 品項
    const typeMap = { "外套": "外套單件", "褲子": "褲子單件" };
    const itemTypes = [...new Set(cards.map(c => typeMap[c.type] || c.type))];

    // 3. 樣式文字 + 工資
    const styleTexts = buildStyleTexts(cards);
    const wages = calcWages(cards);

    const today = new Date().toISOString().slice(0, 10);
    const month = monthStr();
    const orderName = `${customer.name} - ${itemTypes.join("、")} - ${today}`;

    // 4. 建訂單
    const orderProps = {
      "訂單名稱": prop.title(orderName),
      "客戶": prop.relation(customerId),
      "品項": prop.multiSelect(itemTypes),
      "訂單狀態": prop.select("✅ 訂單成立"),
      "流程": prop.select("📐 打版"),
      "訂單日期": prop.date(today),
      "實際售價": prop.number(totalActual),
      "建議售價": prop.number(totalSuggested),
      "訂金": prop.number(Number(deposit) || 0),
      "尾款": prop.number(totalActual - (Number(deposit) || 0)),
      "外套工資": prop.number(wages.jacket),
      "褲子工資": prop.number(wages.trouser),
      "經理費": prop.number(wages.manager),
      "師傅工資合計": prop.number(wages.total),
      "卡片數量": prop.number(cards.length),
      "樣式明細": prop.text(JSON.stringify(cards).slice(0, 2000)),
      "外套樣式": prop.text(styleTexts.外套樣式),
      "褲子樣式": prop.text(styleTexts.褲子樣式),
      "背心樣式": prop.text(styleTexts.背心樣式),
      "襯衫樣式": prop.text(styleTexts.襯衫樣式),
      ...(stylePhotoUrls?.length ? { "款式參考圖": prop.text(stylePhotoUrls.join("\n")) } : {}),
      ...(bodyPhotoUrls?.length ? { "身材照片": prop.text(bodyPhotoUrls.join("\n")) } : {}),
    };
    const order = await createPage(DB.order, orderProps);

    // 5. 量身（西裝）
    const hasMeas = measurements && Object.values(measurements).some(v => v !== "" && v != null);
    if (hasMeas) {
      const MEAS_GROUPS = [
        { label: "【上身】", fields: ["領圍","胸圍","腰圍","臀圍","肩寬","半肩寬","前胸寬","後背寬","上臂圍","下臂圍","手腕圍"] },
        { label: "【長度】", fields: ["袖長","前身長","後身長","後領寬","背心長"] },
        { label: "【下身】", fields: ["褲腰","褲長","前檔長","下檔長","大腿圍","小腿圍","腳踝圍"] },
      ];
      const measText = MEAS_GROUPS.map(g => {
        const lines = g.fields.filter(f => measurements[f]).map(f => `  ${f.padEnd(4, "　")}${measurements[f]} in`);
        return lines.length ? `${g.label}\n${lines.join("\n")}` : "";
      }).filter(Boolean).join("\n");
      const measProps = {
        "量身名稱": prop.title(`${customer.name} - ${today}`),
        "客戶": prop.relation(customerId),
        "訂單": prop.relation(order.id),
        "量身日期": prop.date(today),
        "量身資料": prop.text(measText),
      };
      if (measNote) measProps["體型備註"] = prop.text(measNote);
      await createPage(DB.measurement, measProps);
    }

    // 6. 自動產生財務「訂單收入」記錄
    await createPage(DB.finance, {
      "項目名稱": prop.title(`${customer.name} 訂單收入`),
      "類型": prop.select("💵 收入"),
      "分類": prop.select("訂單收入"),
      "金額": prop.number(totalActual),
      "關聯訂單": prop.relation(order.id),
      "帳戶": prop.select("🏦 銀行"),
      "付款狀態": prop.select("待收/待付"),
      "日期": prop.date(today),
      "結算月份": prop.text(month),
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      orderUrl: order.url,
      message: "訂單建立成功",
    });

  } catch (err) {
    console.error("create-order error:", err);
    return res.status(500).json({ success: false, error: err.message || "未知錯誤" });
  }
}
