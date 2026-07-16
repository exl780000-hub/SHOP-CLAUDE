import { put } from "@vercel/blob";
import { cors, requireAuth } from "./_notion.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const filename = req.headers["x-filename"] || `upload-${Date.now()}.jpg`;
    const contentType = req.headers["content-type"] || "image/jpeg";

    const blob = await put(filename, req, {
      access: "public",
      contentType,
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (err) {
    console.error("upload-image error:", err);
    return res.status(500).json({ success: false, error: err.message || "上傳失敗" });
  }
}
