import { DB, queryDatabase, cors, monthStr } from "./_notion.js";

const BASE_FIXED_COST = 97649;

// 公司費（回本進度）跟訂單利潤（純利潤）分開計算，不混在同一個進度條裡
export async function computeSummary(month) {
  const monthStart = `${month}-01`;
  const nextMonthDate = new Date(month + "-01");
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const monthEnd = nextMonthDate.toISOString().slice(0, 10);

  // 1. 本月訂單（公司費 + 訂單利潤，各自獨立）
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

  // 3. 計算：公司費 vs 固定成本（回本進度），訂單利潤獨立不混入
  const totalCost = BASE_FIXED_COST + extraExpense;
  const fixedCostBalance = totalCompanyFee - totalCost; // 固定成本結餘（正=已回本有餘，負=還沒回本）
  const coverRate = totalCost > 0 ? Math.min(totalCompanyFee / totalCost, 1) : 0;
  const netProfit = fixedCostBalance + totalOrderProfit; // 最終月收益（結尾才加總）

  return {
    month,
    // 訂單貢獻（各自獨立）
    totalCompanyFee,
    totalOrderProfit,
    orderCount: orderDetails.length,
    orderDetails,
    // 固定成本
    baseCost: BASE_FIXED_COST,
    extraExpense,
    extraItems,
    totalCost,
    // 固定成本回本（只看公司費，不含利潤）
    fixedCostBalance,
    coverRate,
    // 最終月收益（公司費結餘 + 利潤，最後才加總）
    netProfit,
    // 收入（訂單售價合計，for reference）
    income,
    // 待收付
    pendingIn,
    pendingOut,
    pendingList: pendingList.sort((a, b) => (b.date > a.date ? 1 : -1)),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ?trend=1&months=N：回傳近 N 個月趨勢（合併自 finance-trend.js，節省 Vercel serverless function 額度）
    if (req.query.trend) {
      const n = Math.min(Number(req.query.months) || 6, 12);
      const base = req.query.month ? new Date(req.query.month + "-01") : new Date();
      const months = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setMonth(d.getMonth() - i);
        months.push(monthStr(d));
      }
      const summaries = await Promise.all(months.map(m => computeSummary(m)));
      return res.status(200).json({
        success: true,
        trend: summaries.map(s => ({
          month: s.month,
          totalCompanyFee: s.totalCompanyFee,
          totalOrderProfit: s.totalOrderProfit,
          totalCost: s.totalCost,
          netProfit: s.netProfit,
        })),
      });
    }

    const month = req.query.month || monthStr();
    const summary = await computeSummary(month);
    return res.status(200).json({ success: true, ...summary });
  } catch (err) {
    console.error("finance-summary error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
