const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── stooq CSV parser ──────────────────────────────────────────────────────────
// stooq returns CSV: Date,Open,High,Low,Close,Volume
function parseStooqCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  return lines.slice(1) // skip header
    .map(line => {
      const [date, open, high, low, close, volume] = line.split(",");
      return {
        date,
        open:   parseFloat(open),
        high:   parseFloat(high),
        low:    parseFloat(low),
        close:  parseFloat(close),
        volume: parseInt(volume) || 0,
      };
    })
    .filter(d => !isNaN(d.close) && d.close > 0)
    .reverse(); // stooq returns newest first, flip to oldest first
}

// ── /api/stock?code=2330 ──────────────────────────────────────────────────────
app.get("/api/stock", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "缺少參數 code" });

  // stooq uses lowercase symbol with .tw suffix
  const symbol = `${code}.tw`;
  const url = `https://stooq.com/q/d/l/?s=${symbol}&i=d`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!r.ok) throw new Error(`stooq responded with ${r.status}`);

    const csv = await r.text();

    // stooq returns "No data" page if symbol not found
    if (!csv.includes("Date") || csv.includes("Przekroczony")) {
      return res.status(404).json({ error: "查無此股票代碼" });
    }

    const data = parseStooqCSV(csv);

    if (!data.length) {
      return res.status(404).json({ error: "查無交易資料" });
    }

    // Return last 30 trading days
    res.json({ stat: "OK", data: data.slice(-30) });

  } catch (e) {
    console.error("fetch error:", e.message);
    res.status(500).json({ error: "無法取得股價數據", detail: e.message });
  }
});

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 台股 AI 系統啟動中：http://localhost:${PORT}`);
});
