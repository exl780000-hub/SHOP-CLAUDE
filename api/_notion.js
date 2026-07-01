// Notion REST API helper (no SDK needed, uses fetch)
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

export const DB = {
  customer: "0bb6a9cb-5c82-44ab-b4af-6e461695f002",
  order: "98f18257-9c28-41a5-a676-31bebb23e769",
  measurement: "1bfae58f-449d-47fb-a808-3f316e266ebf",
  dispatch: "e6dbceba-5e2a-4bb0-97d8-623622f515fb",
  finance: "06c95176-c04c-4a2d-9428-4080d5bd5317",
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
  return notionFetch(`databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(filter ? { filter } : {}),
  });
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
