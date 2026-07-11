# GONY 系統工作日誌（WORKLOG）

> 本檔為開發工作的持續紀錄。**之後每次工作完成都要在「工作紀錄」新增一筆**，
> 上下文壓縮後以此檔為準快速接手。專案商業邏輯見 CLAUDE.md。

## 開發工作流程（固定步驟）

1. 開發分支：`claude/project-setup-dev-496913`（在此 commit）
2. 每次修改後：`npm run build` 確認編譯通過；API 檔案跑 `node --check`
3. 推送（兩個都要推，缺一不可）：
   ```
   git push origin claude/project-setup-dev-496913        # 開發分支
   git push origin claude/project-setup-dev-496913:main   # 部署分支（Vercel 追 main）
   ```
4. Vercel 自動部署 main（1-2 分鐘）；有疑慮時請店主到 Vercel Deployments 確認最新一筆是 Ready
5. Commit 簽名：`git config user.email noreply@anthropic.com`、`user.name Claude`（stop hook 會檢查，遇警告執行 `git commit --amend --no-edit --reset-author` 後重推）

## ⚠️ 注意事項（踩過的坑，違反必出事）

1. **Vercel Hobby 上限 12 個 Serverless Functions**，目前 `api/` 已用 **11 個**。
   新功能一律併入現有 API（用 query 參數或 action 分流），不新增檔案。
   超限時部署會 Error 且無明顯通知——每次推完留意部署狀態。
2. **Notion 分頁**：`_notion.js` 的 `queryDatabase` 已做自動翻頁（上限 1000 筆），新查詢一律走它，不要自己打 Notion API。
3. **React 元件禁止定義在另一個元件函式內**（iOS 打字鍵盤會收合）。一律模組層級定義。
4. **數字輸入**加 `inputMode="decimal"`；尺寸欄位限制 XX.X 格式（`sanitizeSize`）。
5. **底部固定列**：`left:64`（讓開側欄）＋ `env(safe-area-inset-bottom)`。
6. **流程狀態值**：前端按鈕值必須與 create-order / create-dispatch / update-dispatch 寫入值完全一致（6 階段：📐打版→🪡製作毛胚→✂️開始製作→🧍第二試身→🪢最後縫製→🎉完成訂單；歸檔＝訂單狀態「🎉 完成取件」）。
7. **工資單一資料源**：update-order 存訂單工資時會自動同步派工單（工資金額＋工資確認）；月結、收尾清單都讀派工單。不要另寫第二套。
8. **Notion 欄位名**以資料庫實際 schema 為準（例：前端「領圍」→ Notion「頸圍」，對照表在 create-order.js 的 MEAS_MAP）。

## 系統現況（2026-07-11）

- 導航 5 頁：建立訂單 / 訂單查詢 / 派工中心 / 快速記帳(含月報表) / 工資計算
- 舊「派工管理」頁已從導航移除（路由 /dispatch 仍在，確認不用後可刪檔）
- 訂單查詢與工資計算支援 卡片/表格 雙檢視（寬螢幕預設表格，偏好記在 localStorage）
- 定價：工本費＋布料＋布損(級距5%/3%、上限70%)×利潤率(8段)，進位百元；支援 HKD/EUR 即時匯率
- 扣眼預設：前身(單排=扣數/雙排=3)＋袖扣×2；米蘭眼預設 1
- 月報表：公司費回本進度與利潤分離，最後加總，6 個月趨勢圖
- 月結：各師傅分開結算，同師傅同月防重複
- 新系統（Next.js+Supabase）規劃中：PRD/開發規格補充章節已放店主雲端（Google Docs「補充章節 v1」），八大決策已定（不遷資料/照片Supabase+Drive/工資進MVP/16+8態/參數後台可調/匯率MVP/Vercel Pro/痛點四類）

## 待辦

- [x] Claude Design 元件庫推送（已完成：9 張卡推到 claude.ai/design 專案「Design System」93fa6c3d-...，分 基礎/元件/版面 三組）
- [ ] 清理項：刪舊 Dispatch.jsx、簡化 Orders 的 collectedIds/balancePending 雙狀態、Dashboard 內部 Sec 搬出
- [ ] 月報表趨勢圖載入偏慢（6個月×2查詢），可改點開才載
- [ ] 歷史訂單 30 天自動摺疊、客戶維度檢視（規劃過未做）
- [ ] 行銷模組（未開始）

## 工作紀錄

### 2026-07-11
- 建立本檔（WORKLOG.md）＋ CLAUDE.md 加入指引；完整原始檔 ZIP 備份交付店主
- GONY 設計系統 9 張元件卡推上 Claude Design（色彩/字體/按鈕/卡片/輸入/標籤/表格/財務圖表/導航）
- 新增「🧮 工資試算」獨立頁（/wage-calc）：五分頁（外套/褲子/經理/背心/修改），純前端手動勾選即時計算，不連訂單派工不寫資料，導航第 6 項

### 2026-07-06 ~ 07-10（本輪大改版摘要）
- 訂單查詢：分層(需處理/進行中/歸檔)、收尾清單＋歸檔、尾款/工資標籤、即時搜尋(含電話)、Excel 表格檢視
- 工資計算：儲存同步派工單、扣眼新規則、待計算/已確認分區、月結搬入並各師傅分開結算、修改單/背心單工資區、表格檢視
- 派工中心：待派工卡內建單(逐張缺單檢查)、逾期置頂/倒數/改期限、已完成月篩選、導航整併
- 全站：Notion 自動分頁(修 100 筆截斷)、寬螢幕雙欄/格狀排版、視覺統一(陰影/圓角/字距)、匯率換算、量身備註、卡住天數追蹤
- 修復：Vercel 12 函式上限導致部署連續失敗(合併 3 支 API)、iOS 鍵盤收合(元件內定義)、底部按鈕被側欄蓋住
- PRD/開發規格審查＋補充章節 v1 產出（店主雲端）
