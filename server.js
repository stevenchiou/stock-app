const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── Yahoo Finance CSV parser ──────────────────────────────────────────────────
// Returns CSV: Date,Open,High,Low,Close,Adj Close,Volume
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

  // Yahoo Finance: Taiwan stocks use .TW suffix (TWSE) or .TWO suffix (OTC)
  const symbol = `${code}.TW`;
  const now = Math.floor(Date.now() / 1000);
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${sixtyDaysAgo}&period2=${now}&interval=1d&events=history`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/csv,application/csv,text/plain,*/*",
        "Referer": "https://finance.yahoo.com/",
      },
    });

    if (r.status === 404) {
      // Try OTC market (.TWO)
      const symbolTWO = `${code}.TWO`;
      const urlTWO = `https://query1.finance.yahoo.com/v7/finance/download/${symbolTWO}?period1=${sixtyDaysAgo}&period2=${now}&interval=1d&events=history`;
      const r2 = await fetch(urlTWO, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/csv,application/csv,text/plain,*/*",
          "Referer": "https://finance.yahoo.com/",
        },
      });
      if (!r2.ok) return res.status(404).json({ error: "查無此股票代碼（已嘗試 TWSE 與 OTC 市場）" });
      const csv2 = await r2.text();
      const data2 = parseYahooCSV(csv2).slice(-30);
      if (!data2.length) return res.status(404).json({ error: "查無交易資料" });
      return res.json({ stat: "OK", data: data2 });
    }

    if (!r.ok) throw new Error(`Yahoo Finance responded with ${r.status}`);

    const csv = await r.text();
    const data = parseYahooCSV(csv).slice(-30);

    if (!data.length) return res.status(404).json({ error: "查無交易資料" });

    res.json({ stat: "OK", data });

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

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 台股 AI 系統啟動中：http://localhost:${PORT}`);
});
