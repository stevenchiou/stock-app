const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── TWSE proxy ────────────────────────────────────────────────────────────────
async function fetchTWSEMonth(code, year, month) {
  const ym = `${year}${String(month).padStart(2, "0")}01`;
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${ym}&stockNo=${code}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://www.twse.com.tw/",
    },
  });
  if (!r.ok) throw new Error(`TWSE ${r.status}`);
  const json = await r.json();
  if (json.stat !== "OK" || !json.data?.length) return [];
  return json.data.map(row => ({
    date:   row[0],
    open:   parseFloat(row[3].replace(/,/g, "")),
    high:   parseFloat(row[4].replace(/,/g, "")),
    low:    parseFloat(row[5].replace(/,/g, "")),
    close:  parseFloat(row[6].replace(/,/g, "")),
    volume: parseInt(row[1].replace(/,/g, ""), 10),
  })).filter(d => !isNaN(d.close));
}

// ── /api/stock?code=2330 ──────────────────────────────────────────────────────
app.get("/api/stock", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "缺少參數 code" });

  try {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1;
    let data = await fetchTWSEMonth(code, y, m);

    if (data.length < 5) {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      const prev = await fetchTWSEMonth(code, py, pm);
      data = [...prev, ...data];
    }

    data = data.slice(-30);
    if (!data.length) return res.status(404).json({ error: "查無此股票代碼或今日尚無資料" });

    res.json({ stat: "OK", data });
  } catch (e) {
    console.error("TWSE error:", e.message);
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
