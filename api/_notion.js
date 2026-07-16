// Notion REST API helper (no SDK needed, uses fetch)
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

export const DB = {
  customer: "0bb6a9cb-5c82-44ab-b4af-6e461695f002",
  order: "98f18257-9c28-41a5-a676-31bebb23e769",
  measurement: "1bfae58f-449d-47fb-a808-3f316e266ebf",
  dispatch: "e6dbceba-5e2a-4bb0-97d8-623622f515fb",
  finance: "06c95176-c04c-4a2d-9428-4080d5bd5317",
  wageCalc: "12cc4105-77c2-48f6-b702-443910366a66", // 工資試算紀錄（獨立，不連訂單）
};

async function notionFetch(path, options = {}) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Notion API error ${res.status}`);
  }
  return data;
}

export async function queryDatabase(databaseId, filter) {
  // Notion 單次查詢上限 100 筆；自動翻頁把所有結果接起來（安全上限 10 頁 = 1000 筆）
  const results = [];
  let cursor = undefined;
  for (let page = 0; page < 10; page++) {
    const data = await notionFetch(`databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({
        ...(filter ? { filter } : {}),
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    results.push(...data.results);
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return { results };
}

export async function createPage(databaseId, properties) {
  return notionFetch("pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
}

export async function getPage(pageId) {
  return notionFetch(`pages/${pageId}`, { method: "GET" });
}

export async function archivePage(pageId) {
  return notionFetch(`pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  });
}

export async function updatePage(pageId, properties) {
  return notionFetch(`pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

// Property builders
export const prop = {
  title: (text) => ({ title: [{ text: { content: String(text || "") } }] }),
  text: (text) => ({ rich_text: [{ text: { content: String(text || "") } }] }),
  number: (n) => ({ number: Number(n) || 0 }),
  select: (name) => name ? ({ select: { name } }) : ({ select: null }),
  multiSelect: (names) => ({ multi_select: (names || []).map(n => ({ name: n })) }),
  date: (iso) => iso ? ({ date: { start: iso } }) : ({ date: null }),
  phone: (p) => ({ phone_number: String(p || "") }),
  checkbox: (b) => ({ checkbox: !!b }),
  relation: (ids) => ({ relation: (Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(id => ({ id })) }),
  url: (u) => u ? ({ url: u }) : ({ url: null }),
  files: (urls) => ({ files: (urls || []).filter(Boolean).map((u, i) => ({ type: "external", name: `photo-${i + 1}`, external: { url: u } })) }),
};

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token");
}

// ── 登入驗證（環境變數 APP_PASSWORD 未設定時 = 不啟用登入）────────────────
import { createHmac, timingSafeEqual } from "crypto";

function authSecret() {
  // 密碼＋Notion token 混合當簽章金鑰，改密碼即讓所有舊權杖失效
  return `${process.env.APP_PASSWORD || ""}::${NOTION_TOKEN || ""}`;
}

function sign(exp) {
  return createHmac("sha256", authSecret()).update(String(exp)).digest("hex");
}

// 產生權杖（預設 30 天有效）
export function makeToken(days = 30) {
  const exp = Date.now() + days * 86400000;
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  const [expStr, sig] = String(token || "").split(".");
  const exp = Number(expStr);
  if (!exp || !sig || Date.now() > exp) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// 每支 API 開頭呼叫：通過回 true；失敗回 401 並回 false
export function requireAuth(req, res) {
  if (!process.env.APP_PASSWORD) return true; // 未設密碼 → 不啟用登入
  const token = req.headers["x-auth-token"];
  if (verifyToken(token)) return true;
  res.status(401).json({ success: false, error: "未登入或登入已過期", authRequired: true });
  return false;
}

export function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
