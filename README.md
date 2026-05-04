# Tesla Road Trips · Wild Europe in a Model Y

A small static site documenting overland European road trips done in a Tesla Model Y, sleeping in the car every night.

**Live site:** auto-deployed to Vercel from this repository.

## Trips

| File | Trip | Days | km | Countries |
|---|---|---|---|---|
| [`index.html`](index.html) | Landing page · pick a trip | — | — | — |
| [`greece.html`](greece.html) | Adriatic → Greece overland → Bosnia loop | 30 | ~8,400 | 8 |
| [`iberia.html`](iberia.html) | Atlantic Iberian coast → Mediterranean back | 30 | ~6,800 | 3 |
| [`lakes.html`](lakes.html) | French lakes loop (no motorway) | 10 | ~2,300 | 1 |
| [`alpine.html`](alpine.html) | French Alps loop (from Chambéry, summer) | 5 | ~470 | 1 |

Each trip page is **fully self-contained**: same template, different content, different theme colors. Adding a new trip = duplicate one of the existing pages and rewrite the route.

## What's in each trip page

- **Interactive Leaflet map** with real driving routes from OpenStreetMap (OSRM)
- **Toggle** between outbound and return directions
- **Hour-by-hour timeline** for each of the 30 days, color-coded by activity (charge, drive, visit, eat, sleep…)
- **Tap-to-photo carousel** on every bolded place name, sourced from Wikipedia, Wikidata and Wikimedia Commons (no API key)
- Full **field manual**: borders, sleeping legality, charging strategy, budget anchors

## Tech

Pure static HTML — single file per trip, no build step.

- [Leaflet](https://leafletjs.com) for the map
- [CARTO](https://carto.com) light basemap tiles
- [OSRM](http://project-osrm.org) public routing API
- [Pexels API](https://www.pexels.com/api/) for high-quality place photos (primary)
- [Wikimedia Commons](https://commons.wikimedia.org) as photo fallback

## Setting up photos · Pexels

Photos are served by a Vercel serverless function (`api/images.js`) that proxies Pexels server-side. Pexels has a free tier with no credit card required.

1. Sign up at [pexels.com/api/new](https://www.pexels.com/api/new/) → copy your API key
2. Vercel dashboard → your project → **Settings → Environment Variables** → add:
   - **Key:** `PEXELS_API_KEY`
   - **Value:** your key
   - **Environment:** Production, Preview, Development (all three)
3. Redeploy (Deployments → ⋯ → Redeploy)
4. Verify by visiting `/api/images?diag=1` — should show `hasPexelsKey: true`

### Without a key

The function still works without `PEXELS_API_KEY` — it falls back automatically to:
1. Wikipedia summary endpoint (single curated main image)
2. Wikimedia Commons file search (multiple photos)
3. Wikidata → Commons category (final fallback for obscure places)

Quality varies but it's truly zero-config.

## Local

Open `index.html` in any modern browser. No server required (though some APIs work better over `http://localhost` than `file://`).

## Add a new trip

1. Duplicate `iberia.html` → `<your-trip>.html`
2. Replace the `route = [...]` array with your stops
3. Replace the day cards (timelines)
4. Update hero stats and theme colors
5. Add a card for it in `index.html` (the landing page)
6. `git add . && git commit -m "Add <your-trip>" && git push`

## Deploy

Connected to Vercel — every push to `main` redeploys automatically.
