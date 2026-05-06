const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── TWSE proxy endpoint ───────────────────────────────────────────────────────
// GET /api/stock?code=2330&year=2025&month=4
app.get("/api/stock", async (req, res) => {
  const { code, year, month } = req.query;
  if (!code || !year || !month) {
    return res.status(400).json({ error: "缺少參數 code / year / month" });
  }

  const ym = `${year}${String(month).padStart(2, "0")}01`;
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${ym}&stockNo=${code}`;

  try {
    const twseRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await twseRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "無法連接台灣證交所", detail: e.message });
  }
});

// ── Fallback: serve index.html ────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 台股 AI 系統啟動中：http://localhost:${PORT}`);
});
