// Vercel serverless function · proxies Google Custom Search API
//
// Required env vars (set in Vercel dashboard → Project → Settings → Environment Variables):
//   GOOGLE_API_KEY  · your Google Cloud API key with Custom Search API enabled
//   GOOGLE_CSE_ID   · your Programmable Search Engine ID (cx)
//
// Called from the trip pages via:
//   GET /api/images?q=Lac+Pavin
// Returns:
//   { items: [{ link: "https://..." }, ...] }
//
// Edge cache: 24h on Vercel CDN, so popular queries cost almost nothing.

export default async function handler(req, res) {
  const q = (req.query && req.query.q) || '';
  const diag = req.query && req.query.diag;

  // Diagnostic mode: GET /api/images?diag=1
  // Returns env-var status without exposing values, plus a test Google call.
  if (diag) {
    const key = process.env.GOOGLE_API_KEY || '';
    const cx = process.env.GOOGLE_CSE_ID || '';
    const out = {
      hasKey: !!key,
      hasCx: !!cx,
      keyPrefix: key ? key.slice(0, 6) + '…' : null,
      keyLength: key.length,
      cxValue: cx,
      nodeVersion: process.version,
    };
    if (key && cx) {
      try {
        const testUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=test&searchType=image&num=1`;
        const r = await fetch(testUrl);
        out.googleStatus = r.status;
        if (!r.ok) {
          const txt = await r.text();
          try { out.googleError = JSON.parse(txt).error; }
          catch(_) { out.googleErrorRaw = txt.slice(0, 500); }
        } else {
          const j = await r.json();
          out.googleResultCount = (j.items || []).length;
        }
      } catch (e) {
        out.googleException = String(e && e.message || e);
      }
    }
    res.status(200).json(out);
    return;
  }

  if (!q) {
    res.status(400).json({ error: 'Missing q parameter. Try ?diag=1 to debug config.' });
    return;
  }

  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) {
    res.status(503).json({
      error: 'Server not configured',
      hint: 'Set GOOGLE_API_KEY and GOOGLE_CSE_ID env vars in Vercel and redeploy.',
      items: []
    });
    return;
  }

  const url = `https://www.googleapis.com/customsearch/v1`
    + `?key=${encodeURIComponent(key)}`
    + `&cx=${encodeURIComponent(cx)}`
    + `&q=${encodeURIComponent(q)}`
    + `&searchType=image`
    + `&num=10`
    + `&safe=active`
    + `&imgSize=large`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      let parsed = null;
      try { parsed = JSON.parse(txt).error; } catch(_) {}
      res.status(r.status).json({
        error: 'Google API ' + r.status,
        google: parsed || txt.slice(0, 300),
        hint: r.status === 403
          ? 'Likely the API key has HTTP-referrer restriction (blocks server-to-server calls). In Google Cloud Console set Application restrictions to "None" — keep API restriction to "Custom Search API" only.'
          : r.status === 429
          ? 'Quota exceeded (100/day on free tier).'
          : null,
        items: []
      });
      return;
    }
    const data = await r.json();
    const items = (data.items || []).map(it => ({ link: it.link })).filter(it => it.link);

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e), items: [] });
  }
}
