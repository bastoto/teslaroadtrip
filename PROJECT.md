# Tesla Road Trips — Project Documentation

> A detailed technical and editorial walkthrough of the **Tesla Road Trips** project: what it is, how it's built, how each page works, and how to extend it.
> For the short version, see [`README.md`](README.md).

---

## 1. What this project is

**Tesla Road Trips** is a static website that documents multi-day overland road trips across Europe, driven in a **Tesla Model Y** and **sleeping in the car every night** (€0 accommodation). It is part travel journal, part interactive trip planner.

Each trip is presented as a self-contained, mobile-first web page with:

- an **interactive map** that draws the *real* driving route (not straight lines),
- a **day-by-day, hour-by-hour timeline** of the journey,
- **free overnight sleep spots** verified on Park4Night,
- a **charging strategy** (where to charge, arrive/leave battery %),
- **live photos** of every notable place, pulled on demand from public image sources.

The site is intentionally **build-step-free**: every page is a single hand-written HTML file with inline CSS and JavaScript. There is no framework, no bundler, no `package.json` to install. You can open any page directly in a browser.

**Live site:** auto-deployed to Vercel on every push to `main`.
**Repository:** <https://github.com/bastoto/teslaroadtrip>

---

## 2. Repository layout

```
road trip plan/
├── index.html        # Landing page — gallery of all trips
├── greece.html       # Trip 01 · Adriatic → Greece → Bosnia loop (30 days)
├── iberia.html       # Trip 02 · Atlantic Iberia → Mediterranean back (30 days)
├── lakes.html        # Trip 03 · French lakes loop, no motorways (10 days)
├── alpine.html       # Trip 04 · French Alps loop from Chambéry (5 days)
├── api/
│   └── images.js     # Vercel serverless function — on-demand place photos
├── README.md         # Short overview + setup
├── PROJECT.md        # This document
└── .gitignore
```

Each `*.html` trip file is **fully independent** — same underlying template, different route data, different theme colors. There is no shared CSS/JS file; everything a page needs is inlined. This is a deliberate trade-off: duplication in exchange for zero build tooling and trivially portable pages.

---

## 3. The trips

| Page | Trip | Days | Distance | Countries | Highlights |
|---|---|---|---|---|---|
| [`greece.html`](greece.html) | Adriatic → Greece overland → Bosnia loop | 30 | ~8,400 km | 8 | Dolomites, Triglav, Theth, Vikos, Olympus, Peloponnese |
| [`iberia.html`](iberia.html) | Atlantic Iberian coast → Mediterranean back | 30 | ~6,800 km | 3 | Cantabria, Galicia, Portuguese cliffs, Sagres, Cap de Creus |
| [`lakes.html`](lakes.html) | French lakes loop (zero motorway) | 10 | ~2,300 km | 1 | Lac Pavin, Lac du Salagou, Lac de Sainte-Croix (Verdon) |
| [`alpine.html`](alpine.html) | French Alps loop from Chambéry (summer) | 5 | ~470 km | 1 | Lac d'Annecy, Lac de Roselend, Vanoise, Col de l'Iseran |

All trips share three design constraints:

1. **Real schedules** — every day is a timeline built around a ~9-to-9 awake window and a ~250 km/day comfort ceiling.
2. **€0 accommodation** — every overnight is a verified free public spot (aires, lay-bys, forest parking, clifftop pull-offs), linked to Park4Night.
3. **Real driving routes** — map geometry comes from actual roads via OSRM, not drawn by hand.

---

## 4. The landing page (`index.html`)

The landing page is a static gallery. It contains:

- a **hero** section stating the premise (free overnight spots, fast charging, no hotels);
- a **trips grid** of cards — one per trip, each with a gradient banner, tagline, description, and a 6-stat block (days, km, countries, national parks, charging cost, accommodation cost);
- a **placeholder card** ("Next trip") that documents how new trips slot in;
- an **about** section explaining the philosophy (real schedules, €0 accommodation, real routes);
- a **footer** linking to GitHub.

It is pure HTML + inline CSS — no JavaScript. Theme: warm paper background (`#F4EFE3`), serif display type (Cormorant Garamond) over Inter body text, per-trip banner gradients.

---

## 5. Anatomy of a trip page

Every trip page follows the same template. Using [`alpine.html`](alpine.html) as the reference (it's the most recently reshaped into the "tablet-app" full-viewport UI):

### 5.1 Head & dependencies

Loaded from CDNs (no local copies):

- **Leaflet 1.9.4** (`unpkg.com`, with SRI integrity hashes) — the map engine.
- **Google Fonts** — Cormorant Garamond (display) + Inter (body).
- **CARTO `light_all` basemap tiles** — the muted map background.

### 5.2 Trip data (the heart of the page)

Near the bottom of the page, a `route`/`days` data structure defines the trip as an array of **days**, each containing an ordered list of **waypoints**:

```js
// Each waypoint: { type, coords:[lat,lng], name, arrive?, leave?, battery?, p4n?, note? }
// type: 'depart' | 'wake' | 'charge' | 'pass' | 'visit' | 'sleep' | 'home'
```

- `type` drives the marker icon and popup styling (charge = lightning bolt, lunch = fork & knife, pass / visit / wake = dot, sleep = bed, etc.).
- `coords` are `[lat, lng]` pairs.
- `arrive` / `leave` carry the battery % at charging stops.
- `p4n` links the overnight spot to a specific Park4Night place.
- `note` is free-text shown in the popup.

This data array is the **single source of truth** for a trip — the map, the markers, the popups, and the timeline are all generated from it.

### 5.3 The map

```js
const map = L.map('map', { zoomControl:true, scrollWheelZoom:false }).setView([45.55, 6.5], 9);
```

- **Real routing via OSRM** — `fetchOSRM(coords)` calls the public OSRM demo server
  (`router.project-osrm.org/route/v1/driving/...?overview=full&geometries=geojson`)
  to fetch true road geometry between a day's waypoints. If OSRM fails, the page
  **falls back to straight lines** between points so the map is never empty.
- **Per-day layers** — `buildAll()` builds a `dayLayers` map: `{ d1: { polyline, markers, latlngs } }`. Each day is its own polyline + marker set, themed in the trip's accent color.
- **One day at a time** — `setActiveDay(dayId)` hides all layers, shows only the active day's route and markers, and fits the map bounds to that day.

### 5.4 Markers & popups

- `makeIcon(wp)` builds a custom SVG marker per waypoint type (lightning bolt for charging, fork & knife for meals, dots for visits/passes).
- `popupHtml(wp, dayIdx)` builds the popup, which can include:
  - a **photo frame** (lazy-loaded — see §6),
  - the place **name + meta line**,
  - an optional **note**,
  - **battery info** (`⚡ Arrive 40% · Leave 80%` for charges, `Battery: 65%` elsewhere),
  - an **"Open in Park4Night"** button (for sleep spots),
  - a **"See on Google Maps"** button (on every marker — links to `google.com/maps?q=lat,lng`).

### 5.5 Navigation UI

The alpine page uses a **full-viewport tablet-app layout**:

- **Day pills** + **prev/next arrows** to move between days (`setActiveDay`).
- **Keyboard shortcuts** — `←` / `→` to change day, `Esc` to close the drawer.
- **"Steps / About the place" tabs** injected into each day phase (`injectPhaseTabs`).
- A **slide-in drawer** holding the trip's reference material (borders, sleeping legality, charging strategy, budget) — `injectPhaseTabs` and the drawer wiring move `trip-info` sections into it.

---

## 6. Photos — the `api/images.js` serverless function

Bolded/notable place names get a **live photo** loaded on demand. The browser requests `/api/images?q=<place name>`, and a Vercel serverless function ([`api/images.js`](api/images.js)) returns a JSON list of image URLs:

```json
{ "items": [{ "link": "https://…" }, …], "source": "pexels" | "wikipedia" | "commons" | "commons-category" }
```

### 6.1 Source ladder (first hit wins)

The function tries sources in priority order and returns the first one that yields images:

1. **Pexels** (`tryPexels`) — high-quality curated photos. Requires `PEXELS_API_KEY`. Skipped if the key isn't set.
2. **Wikipedia summary** (`tryWikipediaSummary`) — the single curated lead image for the page.
3. **Wikimedia Commons search** (`tryCommonsSearch`) — multiple file-namespace images for the query.
4. **Wikidata → Commons category** (`tryWikidataCategory`) — resolves the place to a Wikidata entity, reads its Commons category (property `P373`), and lists files from that category. The last-resort path for obscure places.

This means the feature is **truly zero-config**: with no API key at all, photos still load from Wikipedia/Commons/Wikidata. Adding a Pexels key just upgrades quality.

### 6.2 Noise filtering

Image results are filtered through a `NOISE` regex and MIME checks to strip out non-photographic clutter — SVGs, logos, flags, coats of arms, locator/location maps, icons, etc. — so popups show actual scenery rather than wiki chrome.

### 6.3 Caching & diagnostics

- Successful responses set `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`, so Vercel's edge caches popular queries for 24h (revalidating up to a week). Popular places are effectively free to serve.
- **Diagnostic endpoint:** `GET /api/images?diag=1` reports whether the Pexels key is present (`hasPexelsKey`), a key fingerprint, the configured source list, Node version, Vercel environment, and the deployed commit SHA.

---

## 7. Tech stack summary

| Concern | Choice |
|---|---|
| Page structure | Hand-written static HTML, one file per trip, no build step |
| Styling | Inline CSS, CSS custom properties for theming, mobile-first |
| Type | Cormorant Garamond (display) + Inter (body), via Google Fonts |
| Map | [Leaflet 1.9.4](https://leafletjs.com) |
| Basemap tiles | [CARTO](https://carto.com) `light_all` |
| Routing | [OSRM](http://project-osrm.org) public demo API (driving profile) |
| Photos (primary) | [Pexels API](https://www.pexels.com/api/) via serverless proxy |
| Photos (fallback) | Wikipedia → Wikimedia Commons → Wikidata category |
| Serverless runtime | Vercel functions (Node, `api/images.js`) |
| Hosting / CI | Vercel — auto-deploy on push to `main` |

---

## 8. Running locally

No server or install is required:

1. Open `index.html` in any modern browser, or
2. Serve the folder over `http://localhost` (recommended — some APIs behave better over `http://` than `file://`).

The `/api/images` photo endpoint only runs on Vercel (it's a serverless function). Locally, popups will fall back gracefully if the endpoint isn't reachable. To exercise it locally you can run `vercel dev`.

---

## 9. Photo setup on Vercel (Pexels)

Photos work with no configuration (Wikipedia/Commons fallback). To enable the higher-quality Pexels source:

1. Get a free key at [pexels.com/api/new](https://www.pexels.com/api/new/) (no credit card).
2. Vercel dashboard → project → **Settings → Environment Variables** → add `PEXELS_API_KEY` for Production, Preview, and Development.
3. Redeploy.
4. Verify at `/api/images?diag=1` → should show `"hasPexelsKey": true`.

---

## 10. Adding a new trip

Because each page is self-contained, adding a trip is mostly copy-and-edit:

1. **Duplicate** an existing trip page (e.g. `iberia.html` → `your-trip.html`).
2. **Replace the trip data** — rewrite the `route` / `days` waypoint arrays with your stops (coords, types, battery %, Park4Night links, notes).
3. **Rewrite the day cards / timelines** to match.
4. **Update hero stats and theme colors** for the new trip.
5. **Add a card** for it in `index.html` (and, if you like, retire the placeholder card).
6. **Commit & push** — Vercel auto-deploys:
   ```bash
   git add .
   git commit -m "Add <your-trip>"
   git push
   ```

---

## 11. Design philosophy

- **One file = one trip.** Portability and zero tooling beat DRY here. Any page can be opened, copied, or archived on its own.
- **Data-driven rendering.** The map, markers, popups, and timeline all derive from one waypoint array per trip — edit the data, the page follows.
- **Graceful degradation everywhere.** OSRM down → straight lines. No Pexels key → free photo sources. Photo endpoint unreachable → popups still work.
- **Real, repeatable, free.** The whole point is trips you can actually do: real schedules, real charging, real free sleep spots — not an aspirational itinerary.

---

*No affiliation with Tesla. Built for one driver, shared with everyone.*
