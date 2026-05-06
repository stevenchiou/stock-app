const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const FMP_KEY = "GI7nYkfKWukju9nWXioxu241wTrVwdD3";

// ── /api/stock?code=2330 ──────────────────────────────────────────────────────
app.get("/api/stock", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "缺少參數 code" });

  // FMP 台股格式：2330.TW
  const symbol = `${code}.TW`;
  const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${symbol}&apikey=${FMP_KEY}`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`FMP responded with ${r.status}`);

    const json = await r.json();

    // FMP 回傳格式：{ symbol, historical: [ { date, open, high, low, close, volume, ... } ] }
    const historical = json.historical || json;
    if (!historical || !historical.length) {
      return res.status(404).json({ error: "查無此股票代碼或今日尚無資料" });
    }

    // FMP 由新到舊排列，reverse 後取最近 30 筆
    const data = historical
      .slice(0, 30)
      .reverse()
      .map(d => ({
        date:   d.date,
        open:   d.open,
        high:   d.high,
        low:    d.low,
        close:  d.close,
        volume: d.volume || 0,
      }));

    res.json({ stat: "OK", data });

  } catch (e) {
    console.error("FMP error:", e.message);
    res.status(500).json({ error: "無法取得股價數據", detail: e.message });
  }
});

// ── Serve frontend ────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 台股 AI 系統啟動：http://localhost:${PORT}`);
});
