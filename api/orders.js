import { DB, queryDatabase, cors } from "./_notion.js";

// 依電話查詢客戶是否為回頭客（合併自 customer-history.js，節省 Vercel serverless function 額度）
async function customerHistory(res, phone) {
  phone = (phone || "").trim();
  if (!phone) return res.status(200).json({ success: true, isReturning: false });

  const customerResult = await queryDatabase(DB.customer, {
    property: "電話", phone_number: { equals: phone },
  });
  if (customerResult.results.length === 0) {
    return res.status(200).json({ success: true, isReturning: false });
  }
  const customerId = customerResult.results[0].id;

  const ordersResult = await queryDatabase(DB.order, {
    property: "客戶", relation: { contains: customerId },
  });
  const pastOrders = ordersResult.results
    .map(p => ({
      name: p.properties["訂單名稱"]?.title?.[0]?.plain_text || "",
      date: p.properties["訂單日期"]?.date?.start || "",
      items: (p.properties["品項"]?.multi_select || []).map(s => s.name).join("、"),
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const measResult = await queryDatabase(DB.measurement, {
    property: "客戶", relation: { contains: customerId },
  });
  const latestMeas = measResult.results
    .sort((a, b) => (b.properties["量身日期"]?.date?.start || "").localeCompare(a.properties["量身日期"]?.date?.start || ""))[0];

  return res.status(200).json({
    success: true,
    isReturning: pastOrders.length > 0,
    orderCount: pastOrders.length,
    pastOrders: pastOrders.slice(0, 5),
    latestMeasurement: latestMeas ? {
      date: latestMeas.properties["量身日期"]?.date?.start || "",
      traits: latestMeas.properties["體型特徵"]?.rich_text?.[0]?.plain_text || "",
      note: latestMeas.properties["體型備註"]?.rich_text?.[0]?.plain_text || "",
    } : null,
  });
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.query.phone != null) return await customerHistory(res, req.query.phone);

    const q = (req.query.q || "").trim();
    // 一次抓齊：訂單 + 待收付財務記錄 + 派工單 + 客戶（電話搜尋用）
    const [data, pendingFinance, dispatchData, customerData] = await Promise.all([
      queryDatabase(DB.order),
      queryDatabase(DB.finance, { property: "付款狀態", select: { equals: "待收/待付" } }),
      queryDatabase(DB.dispatch),
      queryDatabase(DB.customer),
    ]);

    // 客戶 id → 電話
    const phoneById = {};
    for (const p of customerData.results) {
      phoneById[p.id] = p.properties["電話"]?.phone_number || "";
    }

    // 有待收記錄的訂單 id 集合
    const pendingBalanceIds = new Set();
    for (const p of pendingFinance.results) {
      for (const rel of p.properties["關聯訂單"]?.relation || []) pendingBalanceIds.add(rel.id);
    }

    // 每筆訂單的派工工資狀態：已完成派工中尚未確認工資的數量
    const wageUnconfirmed = {};
    for (const p of dispatchData.results) {
      const oid = p.properties["訂單"]?.relation?.[0]?.id;
      if (!oid) continue;
      const status = p.properties["狀態"]?.select?.name || "";
      const confirmed = p.properties["工資確認"]?.checkbox || false;
      if (status === "✅ 完成" && !confirmed) wageUnconfirmed[oid] = (wageUnconfirmed[oid] || 0) + 1;
    }

    const orders = data.results.map(p => {
      const props = p.properties;
      const getText = (f) => {
        const prop = props[f];
        if (!prop) return "";
        if (prop.type === "title") return (prop.title[0]?.plain_text) || "";
        if (prop.type === "rich_text") return (prop.rich_text.map(t => t.plain_text).join("")) || "";
        if (prop.type === "select") return prop.select?.name || "";
        if (prop.type === "multi_select") return prop.multi_select.map(s => s.name).join("、");
        if (prop.type === "number") return prop.number;
        if (prop.type === "unique_id") return `${prop.unique_id.prefix || ""}${prop.unique_id.number}`;
        if (prop.type === "date") return prop.date?.start || "";
        return "";
      };
      return {
        id: p.id,
        url: p.url,
        name: getText("訂單名稱"),
        orderNo: getText("訂單編號"),
        items: getText("品項"),
        status: getText("訂單狀態"),
        flow: getText("流程"),
        flowUpdatedAt: getText("流程更新時間"),
        date: getText("訂單日期"),
        actualPrice: getText("實際售價"),
        suggestedPrice: getText("建議售價"),
        deposit: getText("訂金"),
        jacketWage: getText("外套工資"),
        trouserWage: getText("褲子工資"),
        managerFee: getText("經理費"),
        totalWage: getText("師傅工資合計"),
        jacketStyle: getText("外套樣式"),
        trouserStyle: getText("褲子樣式"),
        vestStyle: getText("背心樣式"),
        shirtStyle: getText("襯衫樣式"),
        balancePending: pendingBalanceIds.has(p.id),
        wageUnconfirmedCount: wageUnconfirmed[p.id] || 0,
        customerPhone: phoneById[props["客戶"]?.relation?.[0]?.id] || "",
      };
    });

    const filtered = q
      ? orders.filter(o => o.name.includes(q) || String(o.orderNo).includes(q) || (o.customerPhone || "").includes(q))
      : orders;

    return res.status(200).json({ success: true, orders: filtered });
  } catch (err) {
    console.error("orders error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
