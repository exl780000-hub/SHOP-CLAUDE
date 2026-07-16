import { DB, createPage, queryDatabase, prop, cors, requireAuth, monthStr } from "./_notion.js";

// 即時匯率查詢快取（同一次 function 執行期間內共用，減少重複打外部 API）
const rateCache = {};

async function getExchangeRate(currency) {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `${currency}-${today}`;
  if (rateCache[cacheKey]) return rateCache[cacheKey];

  const r = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
  const d = await r.json();
  if (d.result !== "success" || !d.rates?.TWD) throw new Error("匯率查詢失敗");

  const result = { rate: d.rates.TWD, date: d.time_last_update_utc };
  rateCache[cacheKey] = result;
  return result;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;

  // 即時匯率查詢（港幣/歐元 → 台幣，當日匯率）
  if (req.method === "GET" && req.query.action === "exchange-rate") {
    try {
      const currency = String(req.query.currency || "").toUpperCase();
      if (!["HKD", "EUR"].includes(currency)) {
        return res.status(400).json({ success: false, error: "currency 必須是 HKD 或 EUR" });
      }
      const { rate, date } = await getExchangeRate(currency);
      return res.status(200).json({ success: true, currency, rate, date });
    } catch (err) {
      console.error("exchange-rate error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { action } = req.body;

    // 產生本月固定成本
    if (action === "fixed-cost") {
      const month = monthStr();
      // 檢查是否已存在
      const existing = await queryDatabase(DB.finance, {
        and: [
          { property: "分類", select: { equals: "固定成本" } },
          { property: "結算月份", rich_text: { equals: month } },
        ],
      });
      if (existing.results.length > 0) {
        return res.status(200).json({ success: false, error: `${month} 固定成本已存在` });
      }
      await createPage(DB.finance, {
        "項目名稱": prop.title(`${month} 固定成本`),
        "類型": prop.select("💸 支出"),
        "分類": prop.select("固定成本"),
        "金額": prop.number(97649),
        "帳戶": prop.select("🏦 銀行"),
        "付款狀態": prop.select("已收/已付"),
        "日期": prop.date(new Date().toISOString().slice(0, 10)),
        "結算月份": prop.text(month),
      });
      return res.status(200).json({ success: true, message: `${month} 固定成本已產生 $97,649` });
    }

    // 一般記帳
    const { type, account, category, amount, name, payStatus, date, note } = req.body;
    const today = date || new Date().toISOString().slice(0, 10);
    const month = monthStr(new Date(today));

    await createPage(DB.finance, {
      "項目名稱": prop.title(name || category),
      "類型": prop.select(type || "💸 支出"),
      "分類": prop.select(category),
      "帳戶": prop.select(account),
      "金額": prop.number(amount),
      "付款狀態": prop.select(payStatus || "已收/已付"),
      "日期": prop.date(today),
      "結算月份": prop.text(month),
      ...(note ? { "備註": prop.text(note) } : {}),
    });

    return res.status(200).json({ success: true, message: "記帳成功" });
  } catch (err) {
    console.error("expense error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
