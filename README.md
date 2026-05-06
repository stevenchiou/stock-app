# 台股 AI 決策系統

真實 TWSE 數據 + Claude AI 分析的台股投資建議工具。

## 本機執行

```bash
# 1. 安裝套件
npm install

# 2. 啟動伺服器
npm run dev

# 3. 打開瀏覽器
# http://localhost:3000
```

## 部署到 Vercel（免費上線）

### 步驟一：安裝 Vercel CLI
```bash
npm install -g vercel
```

### 步驟二：登入 Vercel
```bash
vercel login
# 會開瀏覽器讓你用 GitHub 帳號登入
```

### 步驟三：部署
```bash
vercel --prod
# 照著問題回答，全部按 Enter 用預設值就好
```

部署完成後會給你一個網址，例如：
`https://taiwan-stock-predictor.vercel.app`

就這樣，搞定！🎉

---

## 注意事項

- 股價數據來源：台灣證券交易所（TWSE）官方 API
- 收盤後（下午 1:30）當日數據才會更新
- AI 分析僅供參考，虧損請自負 🙃
