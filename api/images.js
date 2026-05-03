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
  if (!q) {
    res.status(400).json({ error: 'Missing q' });
    return;
  }

  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) {
    res.status(503).json({ error: 'Server not configured', items: [] });
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
      res.status(r.status).json({ error: 'Google API error', detail: txt.slice(0, 200), items: [] });
      return;
    }
    const data = await r.json();
    const items = (data.items || []).map(it => ({ link: it.link })).filter(it => it.link);

    // Cache at the Vercel edge for 24h, allow stale-while-revalidate for 7 days
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e), items: [] });
  }
}
