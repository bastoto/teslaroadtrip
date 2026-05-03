// Vercel serverless function · Pexels-first image search proxy
//
// Required env var (set in Vercel dashboard → Project → Settings → Environment Variables):
//   PEXELS_API_KEY  · get one free at https://www.pexels.com/api/new/
//
// Falls back to Wikipedia + Wikimedia Commons (no key needed) if Pexels not set
// or returns nothing.
//
// Diagnostic: GET /api/images?diag=1
// Search:     GET /api/images?q=Lac+Pavin
// Returns:    { items: [{ link: "https://..." }, ...], source: "pexels"|"wikipedia"|"commons" }
//
// Cached 24h on Vercel's edge so popular queries are essentially free.

const NOISE = /(\.svg|commons-logo|wiktionary|wikiquote|wikinews|wikipedia-logo|wikibooks|coat[\s_-]*of[\s_-]*arms|flag[_\s-]|locator|emblem|seal|insignia|disambig|edit-clear|red[\s_-]*pog|gnome-icon|info-icon|increase|decrease|map[\s_-]?of|location[\s_-]?map|world[\s_-]*map)/i;

function commonsPagesToItems(pages) {
  if (!pages) return [];
  return Object.values(pages)
    .map(p => p && p.imageinfo && p.imageinfo[0])
    .filter(Boolean)
    .filter(i => {
      const mime = (i.mime || '').toLowerCase();
      if (mime.includes('svg')) return false;
      if (mime && !/image\/(jpeg|jpg|png|webp|tiff|gif)/.test(mime)) return false;
      return true;
    })
    .filter(i => !NOISE.test((i.url || '').toLowerCase()))
    .map(i => ({ link: i.thumburl || i.url }))
    .filter(it => it.link);
}

async function tryPexels(q) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=10&orientation=landscape`;
    const r = await fetch(url, { headers: { Authorization: key } });
    if (!r.ok) return null;
    const data = await r.json();
    const items = (data.photos || [])
      .map(p => ({ link: p.src.large2x || p.src.large || p.src.original }))
      .filter(it => it.link);
    return items.length ? { items, source: 'pexels' } : null;
  } catch (e) {
    return null;
  }
}

async function tryWikipediaSummary(q) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}?redirect=true`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const link = (j.originalimage && j.originalimage.source) || (j.thumbnail && j.thumbnail.source);
    return link ? { items: [{ link }], source: 'wikipedia' } : null;
  } catch (e) {
    return null;
  }
}

async function tryCommonsSearch(q) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|mime&iiurlwidth=720`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    const items = commonsPagesToItems(data.query && data.query.pages).slice(0, 10);
    return items.length ? { items, source: 'commons' } : null;
  } catch (e) {
    return null;
  }
}

async function tryWikidataCategory(q) {
  try {
    const sUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=1&search=${encodeURIComponent(q)}`;
    const sr = await fetch(sUrl);
    if (!sr.ok) return null;
    const sj = await sr.json();
    const entityId = sj.search && sj.search[0] && sj.search[0].id;
    if (!entityId) return null;

    const cUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${entityId}&property=P373`;
    const cr = await fetch(cUrl);
    if (!cr.ok) return null;
    const cj = await cr.json();
    const claims = (cj.claims && cj.claims.P373) || [];
    const cat = claims[0] && claims[0].mainsnak && claims[0].mainsnak.datavalue && claims[0].mainsnak.datavalue.value;
    if (!cat) return null;

    const fUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtitle=${encodeURIComponent('Category:' + cat)}&gcmtype=file&gcmlimit=20&prop=imageinfo&iiprop=url|mime&iiurlwidth=720`;
    const fr = await fetch(fUrl);
    if (!fr.ok) return null;
    const fj = await fr.json();
    const items = commonsPagesToItems(fj.query && fj.query.pages).slice(0, 10);
    return items.length ? { items, source: 'commons-category' } : null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  const q = (req.query && req.query.q) || '';
  const diag = req.query && req.query.diag;

  if (diag) {
    const key = process.env.PEXELS_API_KEY || '';
    res.status(200).json({
      hasPexelsKey: !!key,
      pexelsKeyLength: key.length,
      pexelsKeyFingerprint: key ? key.slice(0, 8) + '…' + key.slice(-4) : null,
      sources: ['pexels (if key set)', 'wikipedia summary', 'wikimedia commons', 'wikidata→commons category'],
      nodeVersion: process.version,
      vercelEnv: process.env.VERCEL_ENV || null,
      deployedAt: process.env.VERCEL_GIT_COMMIT_SHA
        ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
        : null,
    });
    return;
  }

  if (!q) {
    res.status(400).json({ error: 'Missing q parameter. Try ?diag=1 to see configured sources.' });
    return;
  }

  // Try sources in priority order; return first one with results
  const ladder = [tryPexels, tryWikipediaSummary, tryCommonsSearch, tryWikidataCategory];
  for (const fn of ladder) {
    const result = await fn(q);
    if (result && result.items && result.items.length) {
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      res.status(200).json(result);
      return;
    }
  }

  res.status(200).json({ items: [], source: null, error: 'No images found in any source' });
}
