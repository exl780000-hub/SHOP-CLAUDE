import { DB, queryDatabase, cors, monthStr } from "./_notion.js";

const BASE_FIXED_COST = 97649;

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const month = req.query.month || monthStr();
    const monthStart = `${month}-01`;
    const nextMonthDate = new Date(month + "-01");
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const monthEnd = nextMonthDate.toISOString().slice(0, 10);

    // 1. 本月訂單（公司費 + 訂單利潤）
    const ordersData = await queryDatabase(DB.order, {
      and: [
        { property: "訂單日期", date: { on_or_after: monthStart } },
        { property: "訂單日期", date: { before: monthEnd } },
      ],
    });

    let totalCompanyFee = 0;
    let totalOrderProfit = 0;
    const orderDetails = [];

    for (const p of ordersData.results) {
      const props = p.properties;
      const name = props["訂單名稱"]?.title?.[0]?.plain_text || "未命名";
      const companyFee = props["公司費"]?.number || 0;
      const profit = props["訂單利潤"]?.number || 0;
      const actual = props["實際售價"]?.number || 0;
      totalCompanyFee += companyFee;
      totalOrderProfit += profit;
      orderDetails.push({ name, companyFee, profit, actual });
    }

    // 2. 財務總表：只抓額外支出（非訂單收入）
    const financeData = await queryDatabase(DB.finance, {
      property: "結算月份",
      rich_text: { equals: month },
    });

    let extraExpense = 0;
    let income = 0;
    let pendingIn = 0, pendingOut = 0;
    const pendingList = [];
    const extraItems = [];

    for (const p of financeData.results) {
      const props = p.properties;
      const getText = (f) => {
        const prop = props[f];
        if (!prop) return "";
        if (prop.type === "title") return prop.title[0]?.plain_text || "";
        if (prop.type === "rich_text") return prop.rich_text.map(t => t.plain_text).join("") || "";
        if (prop.type === "select") return prop.select?.name || "";
        if (prop.type === "number") return prop.number ?? 0;
        return "";
      };

      const type = getText("類型");
      const category = getText("分類");
      const amount = Number(getText("金額")) || 0;
      const payStatus = getText("付款狀態");
      const name = getText("項目名稱");
      const date = props["日期"]?.date?.start || "";

      if (type === "💵 收入") {
        income += amount;
      } else if (type === "💸 支出") {
        extraExpense += amount;
        extraItems.push({ name, amount });
      }

      if (payStatus === "待收/待付") {
        if (type === "💵 收入") { pendingIn += amount; pendingList.push({ name, amount, type: "收", date }); }
        else { pendingOut += amount; pendingList.push({ name, amount, type: "付", date }); }
      }
    }

    // 3. 計算
    const totalCost = BASE_FIXED_COST + extraExpense;
    const totalContribution = totalCompanyFee + totalOrderProfit;
    const netProfit = totalContribution - totalCost;
    const coverRate = totalCost > 0 ? Math.min(totalContribution / totalCost, 1) : 0;

    return res.status(200).json({
      success: true,
      month,
      // 訂單貢獻
      totalCompanyFee,
      totalOrderProfit,
      totalContribution,
      orderCount: orderDetails.length,
      orderDetails,
      // 固定成本
      baseCost: BASE_FIXED_COST,
      extraExpense,
      extraItems,
      totalCost,
      // 收益
      netProfit,
      coverRate,
      // 收入（訂單售價合計，for reference）
      income,
      // 待收付
      pendingIn,
      pendingOut,
      pendingList: pendingList.sort((a, b) => (b.date > a.date ? 1 : -1)),
    });
  } catch (err) {
    console.error("finance-summary error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
