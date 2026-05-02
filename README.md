# Tesla Road Trip · Poissy → Greece overland

A 30-day mobile-first single-page travel plan for an overland Europe loop in a Tesla Model Y, sleeping in the car every night.

**Live site:** auto-deployed to Vercel from this repository.

## What's in the page

- **Interactive Leaflet map** with real driving routes from OpenStreetMap (OSRM)
- **Toggle** between outbound (Poissy → Olympia, 23 days) and return (Olympia → Poissy, 7 days)
- **Hour-by-hour timeline** for each of the 30 days, color-coded by activity (charge, drive, visit, eat, sleep…)
- **Tap-to-photo carousel** on every bolded place name, sourced from Wikipedia, Wikidata and Wikimedia Commons (no API key)
- Full **field manual**: borders, sleeping legality, charging strategy, budget anchors

## Tech

Pure static HTML — single file, no build step.

- [Leaflet](https://leafletjs.com) for the map
- [CARTO](https://carto.com) light basemap tiles
- [OSRM](http://project-osrm.org) public routing API
- [Wikimedia Commons](https://commons.wikimedia.org) for place photos

## Local

Open `index.html` in any modern browser. No server required (though some APIs work better over `http://localhost` than `file://`).

## Deploy

Connected to Vercel — every push to `main` redeploys.
