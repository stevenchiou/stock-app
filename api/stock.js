const https = require("https");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { code } = req.query;
  if (!code) {
    res.status(400).json({ error: "缺少參數 code" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const ago60 = now - 60 * 24 * 60 * 60;

  // Try TWSE first, then OTC
  for (const suffix of [".TW", ".TWO"]) {
    const symbol = encodeURIComponent(`${code}${suffix}`);
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${ago60}&period2=${now}&interval=1d&events=history`;

    try {
      const csv = await httpGet(url);
      if (!csv || !csv.includes("Date") || csv.includes("404")) continue;

      const rows = csv.trim().split("\n").slice(1);
      const data = rows.map(line => {
        const [date, open, high, low, close, , volume] = line.split(",");
        return { date, open: +open, high: +high, low: +low, close: +close, volume: +volume || 0 };
      }).filter(d => !isNaN(d.close) && d.close > 0).slice(-30);

      if (!data.length) continue;

      res.status(200).json({ stat: "OK", data });
      return;
    } catch (e) {
      continue;
    }
  }

  res.status(404).json({ error: "查無此股票代碼或今日尚無資料" });
};

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/csv,*/*",
        "Referer": "https://finance.yahoo.com/",
      },
    };
    https.get(url, options, r => {
      if (r.statusCode === 301 || r.statusCode === 302) {
        return resolve(httpGet(r.headers.location));
      }
      let data = "";
      r.on("data", chunk => (data += chunk));
      r.on("end", () => resolve(data));
    }).on("error", reject);
  });
}
