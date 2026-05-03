# 🛠️ YT Monitor 開發過程與技術架構紀錄

這份文件記錄了「YT Live Monitor 多頻道監視器」從雛形到完成的迭代過程，以及在開發中所面臨的挑戰與解決方案。

---

## 📅 開發階段紀實

### Phase 1: 基礎架構與視覺大翻新
最初的需求是一個簡單的 HTML 頁面來播放多個 YouTube 影片。我們決定不依賴龐大的前端框架，採用 **Vanilla HTML/CSS/JS** 進行開發。
*   **視覺設計**：導入了「賽博龐克 (Cyberpunk)」與「毛玻璃 (Glassmorphism)」風格，採用深藍紫背景搭配 `#00f0ff` 青藍色霓虹點綴。
*   **資料獲取**：為了在不使用官方 YouTube Data API (避免需要申請 API Key) 的情況下取得影片標題，我們採用了輕量級的 `noembed` 服務，並做好了 Error Fallback 機制。

### Phase 2: 突破 YouTube 播放限制 (Error 153)
在測試過程中，遇到了嚴重的「YouTube 影片播放器錯誤 153」。
*   **問題分析**：這是因為 YouTube 後台阻擋了缺少有效 `HTTP Referer` 或被設定為不可嵌入的影片。
*   **解決方案**：
    1.  在 HTML head 加入 `<meta name="referrer" content="unsafe-url">`。
    2.  在 iframe 的 URL 中強制帶入 `&origin=https://www.youtube.com` 參數。成功欺騙（繞過）了部分嚴格的嵌入檢查機制。

### Phase 3: 提升使用者生產力 (UX)
為了讓「控制台」名符其實，我們優化了輸入體驗：
*   **大量匯入**：將單行 `input` 改為 `textarea`，並在 JS 中撰寫正則表達式，支援空白、逗號、換行分隔，一鍵批次處理幾十個網址。
*   **自訂排版圖示**：捨棄了普通的文字按鈕，純粹使用 CSS Grid (`grid-template-columns`, `grid-template-rows`) 手工繪製出 2、4、6、9 宮格的幾何圖示，並加上 hover 霓虹效果。
*   **快取陷阱**：在頻繁更新 CSS/JS 時，使用者的瀏覽器快取導致畫面跑版。我們引入了 `?v=X` 的版本號機制 (`style.css?v=6`) 來強制瀏覽器更新。

### Phase 4: 資料狀態管理與可攜性
為了讓使用者的精心設定不會因為換電腦而消失：
*   **群組記憶 (Groups)**：利用 `LocalStorage` 保存不同的 `activeChannels` 陣列，實現了「一鍵切換看盤模式」的群組標籤。
*   **匯出與匯入**：將 `LocalStorage` 內的 JSON 物件，透過 `Base64 (btoa)` 轉換為亂碼代碼字串。讓使用者可以用最簡單的「複製貼上」跨設備轉移設定。
*   **網址分享機制**：利用 `window.history.replaceState` 動態將當前播放的影片 ID 寫入 URL `?c=id1,id2...`。同時在 JS 初始化時讀取參數，實現了「傳送網址即傳送畫面」的強大功能。

### Phase 5: 完美打磨 (Polish & Responsive)
最後針對特定情境進行極致微調：
*   **劇院放大模式 (Focus Mode)**：當使用者想暫時專注於某一個頻道時，與其重排九宮格，不如利用 CSS `position: fixed; z-index: 9999;` 將單一 `.monitor-cell` 瞬間抽離並放大覆蓋全螢幕，配上 `Esc` 鍵監聽，體驗極佳。
*   **手機版防誤觸遮罩 (Scrolling Shield)**：
    *   **痛點**：手機版面垂直排列後，手指在滑動網頁時，一定會摸到 iframe，導致滑動失效或誤觸暫停。
    *   **神級解法**：不寫任何一行 JS，直接在 `.monitor-cell::before` 加上一個高度 `75%`、透明的絕對定位遮罩 (`z-index: 5`)。這讓使用者摸到影片上方 75% 時，其實是摸在一般 div 上而能順暢滑動；同時保留底部 25% 給 YouTube 原生控制列，完美兼顧安全滑動與功能互動。

---

## 🎯 未來展望與潛在優化
1.  **自動頻道狀態檢查**：若未來引進 YouTube API，可定期檢查該頻道是否正在「直播中」，並以紅燈/綠燈顯示狀態。
2.  **全域音量控制**：透過 YouTube Iframe API 的 PostMessage 溝通，實現「一鍵靜音所有頻道」或「單一聲道播放」。
3.  **雲端帳號同步**：整合 Supabase 或 Firebase 進行輕量化登入，達到多設備真正的全自動同步。
