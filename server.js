const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── Yahoo Finance CSV parser ──────────────────────────────────────────────────
function parseYahooCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  return lines.slice(1)
    .map(line => {
      const [date, open, high, low, close, , volume] = line.split(",");
      return {
        date,
        open:   parseFloat(open),
        high:   parseFloat(high),
        low:    parseFloat(low),
        close:  parseFloat(close),
        volume: parseInt(volume) || 0,
      };
    })
    .filter(d => !isNaN(d.close) && d.close > 0);
}

// ── /api/stock?code=2330 ──────────────────────────────────────────────────────
app.get("/api/stock", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "缺少參數 code" });

  const now = Math.floor(Date.now() / 1000);
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/csv,*/*",
    "Referer": "https://finance.yahoo.com/",
  };

  for (const suffix of [".TW", ".TWO"]) {
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${code}${suffix}?period1=${sixtyDaysAgo}&period2=${now}&interval=1d&events=history`;
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) continue;
      const csv = await r.text();
      const data = parseYahooCSV(csv).slice(-30);
      if (!data.length) continue;
      return res.json({ stat: "OK", data });
    } catch (e) {
      continue;
    }
  }

  res.status(404).json({ error: "查無此股票代碼或今日尚無資料" });
});

// ── Serve frontend ────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 台股 AI 系統啟動中：http://localhost:${PORT}`);
});
