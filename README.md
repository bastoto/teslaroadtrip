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

## Setting up Pexels for better photos

The map popups and place-name carousels can pull photos from Pexels (Google-Images-like quality) instead of falling back to Wikipedia/Commons. To enable:

1. Sign up free at [pexels.com/api/new](https://www.pexels.com/api/new/) (no card required, 2 min)
2. Copy your API key
3. In each trip HTML file (`greece.html`, `iberia.html`, `lakes.html`), find the line:
   ```html
   <meta name="pexels-key" content="YOUR_PEXELS_API_KEY">
   ```
   and replace `YOUR_PEXELS_API_KEY` with your actual key.
4. Commit and push — Vercel redeploys.

Without a key, photos still load from Wikipedia/Commons but slower and often less aesthetic.

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
