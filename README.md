# GONY 西裝店管理系統

完整的西裝店訂單管理系統，使用 Vite + React 前端，Vercel Serverless API 串接 Notion。

## 功能
- 📋 訂單系統：四步驟新增訂單（客戶→樣式→量身→定價），自動寫入 Notion，自動產生財務收入記錄
- ✂️ 派工管理：建立 7 種派工單，直接寫入 Notion 派工單資料庫
- 📊 派工追蹤：查看每張訂單派工狀態，標記完成、填送回日期與工資
- 💰 快速記帳：日常收支快速記帳，一鍵產生本月固定成本

## 部署到 Vercel（重點：這版用 Vite 真正編譯，不會空白頁）

### 步驟一：上傳到 GitHub
把整個資料夾上傳到一個新的 GitHub repo（注意：不要上傳 node_modules）

### 步驟二：Vercel 匯入
1. vercel.com → Add New Project → 選這個 repo
2. Framework Preset 會自動偵測為 Vite
3. 先不要 Deploy，先設定環境變數（見步驟三）

### 步驟三：設定環境變數
Settings → Environment Variables 新增：
- Name: `NOTION_TOKEN`
- Value: 你的 Notion Integration Token

### 步驟四：Deploy
完成後會有固定網址，手機可直接開。

## Notion 資料庫 ID（已寫在 api/_notion.js）
- 客戶：0bb6a9cb-5c82-44ab-b4af-6e461695f002
- 訂單：98f18257-9c28-41a5-a676-31bebb23e769
- 量身：1bfae58f-449d-47fb-a808-3f316e266ebf
- 派工：e6dbceba-5e2a-4bb0-97d8-623622f515fb
- 財務：06c95176-c04c-4a2d-9428-4080d5bd5317

記得確認這些資料庫都已分享給你的 Notion Integration。
