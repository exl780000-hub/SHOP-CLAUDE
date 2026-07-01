import { cors, monthStr } from "./_notion.js";
import { computeSummary } from "./finance-summary.js";

// 回傳最近 N 個月的公司費/利潤/固定成本，給月報表加總圖表用
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
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
  } catch (err) {
    console.error("finance-trend error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
