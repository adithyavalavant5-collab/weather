# Weather Early Warning System — Live Weather Module (NEW)

This document explains the **new additive features** added to the existing Weather
Early Warning System. The original application (dashboard, simulator, WebSocket
pipeline, Prisma schema) is **fully preserved** — these features are layered on top.

## TL;DR

A new **Live India Weather Map** section has been added to the top of the dashboard.
It uses **Leaflet + OpenStreetMap tiles** for a real interactive map of India, fetches
**real weather data** from **Open-Meteo** (no API key required) by default, with
optional **OpenWeatherMap** support, and derives **severe-weather alerts** from the
real data while clearly distinguishing them from official provider alerts.

---

## What's New

| # | Feature | Files (high level) |
|---|---------|--------------------|
| 1 | Interactive India map (Leaflet) | `src/components/live-weather/LiveWeatherMap.tsx` |
| 2 | Real-time weather data | `src/services/weather/providers/openMeteo.ts`, `openWeatherMap.ts` |
| 3 | India location support (26+ cities) | `src/lib/india-cities.ts` |
| 4 | Real-time auto-refresh | `src/hooks/useRealWeather.ts` |
| 5 | Forecast visualization | `src/components/live-weather/ForecastChart.tsx` |
| 6 | Early warning / alerts | `src/services/weather/alertEngine.ts`, `RealWeatherAlerts.tsx` |
| 7 | Map weather layers | `WeatherLayerControl.tsx`, `LiveWeatherMap.tsx` |
| 8 | Clean server-side API architecture | `src/services/weather/weatherService.ts` + `/api/weather/*` |
| 9 | Caching + rate-limit protection | `src/services/weather/cache.ts` |
| 10 | Environment configuration | `.env`, `.env.example` |
| 11 | Simulator preserved | `src/lib/weather-engine.ts` (UNCHANGED), bridge in `weatherService.ts` |
| 12 | Fallback behavior | `weatherService.ts` (stale-then-simulator fallback) |
| 13 | Performance (lazy-load) | `LiveWeatherSection.tsx` (lazy import for Leaflet) |
| 14 | Strongly-typed | `src/services/weather/types.ts` (no `any`) |
| 15 | Error handling | `weatherService.ts` (typed `WeatherErrorCode`) |
| 16 | Database untouched | `prisma/schema.prisma` (UNCHANGED) |

---

## 1. How to obtain the weather API key

The default provider is **Open-Meteo** — **no API key required**. The application
works out of the box.

To use **OpenWeatherMap** instead (which also surfaces official severe-weather
alerts from national weather services):

1. Visit https://openweathermap.org/api
2. Sign up for a free account
3. Copy your API key from your account dashboard (it may take ~10 minutes to activate)
4. Set these in `.env`:
   ```
   WEATHER_PROVIDER=openweathermap
   WEATHER_API_KEY=your_actual_key_here
   ```

The provider can be changed at any time by editing `.env` and restarting the dev
server. The architecture is provider-agnostic — adding a new provider only requires
implementing the `WeatherProvider` interface (see
`src/services/weather/providers/types.ts`).

## 2. Required environment variables

All variables below have sensible defaults. See `.env.example` for the full list.

| Variable | Required? | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:/home/z/my-project/db/custom.db` | Prisma SQLite path (existing) |
| `WEATHER_DATA_SOURCE` | No | `simulator` | `real` or `simulator` |
| `WEATHER_PROVIDER` | No | `open-meteo` | `open-meteo` or `openweathermap` |
| `WEATHER_API_KEY` | Only if `WEATHER_PROVIDER=openweathermap` | (empty) | OpenWeatherMap key |
| `WEATHER_API_BASE_URL` | No | `https://api.openweathermap.org` | Override base URL |
| `OPEN_METEO_BASE_URL` | No | `https://api.open-meteo.com` | Override base URL |
| `WEATHER_REFRESH_INTERVAL` | No | `300000` (5 min) | Auto-refresh interval (ms) |
| `WEATHER_CACHE_TTL` | No | `180000` (3 min) | Cache TTL (ms) |

## 3. How to enable real weather

Two ways:

**A. Edit `.env`** (persists across restarts):
```bash
WEATHER_DATA_SOURCE=real
WEATHER_PROVIDER=open-meteo  # default, no key required
```

**B. Runtime toggle** in the UI (in-memory, resets on server restart):
Open the dashboard → scroll to the new "Live India Weather Map" section →
in the right sidebar, find the "Live Weather Data Source" card → click
"Real API" or "Simulator" button. Use "Reset to env default" to revert.

## 4. How to enable simulator mode

```bash
WEATHER_DATA_SOURCE=simulator
```

Or use the runtime toggle in the UI (see #3 above).

When in simulator mode, the new live-weather module calls the **existing
`weather-engine.ts` simulator** (unchanged) through a thin bridge in
`weatherService.ts`. The existing WebSocket pipeline
(`mini-services/weather-simulator` on port 3003) is **completely untouched** and
continues to push live updates to the original dashboard widgets.

## 5. How to start the application

```bash
# Install dependencies
bun install

# Run database migrations (if not already done)
bun run db:push

# Start the Next.js dev server (auto-started in this sandbox)
bun run dev

# (Separately) Start the existing weather-simulator WebSocket mini-service:
cd mini-services/weather-simulator && bun install && bun run dev
```

In this sandbox environment, both the Next.js dev server (port 3000) and the
weather-simulator mini-service (port 3003) are started automatically.

## 6. How to start the existing weather simulator

The existing simulator is a Socket.IO mini-service at `mini-services/weather-simulator/`.
It runs on port 3003 and pushes `weather_update` and `alert_triggered` events to the
existing dashboard widgets.

```bash
cd mini-services/weather-simulator
bun install
bun run dev
```

The frontend connects to it via `io('/?XTransformPort=3003')` (per the Caddy
gateway convention). This is **unchanged** — see `src/lib/useWeatherSocket.ts`.

## 7. How the India map works

- Uses **Leaflet** (via `react-leaflet`) with **OpenStreetMap** raster tiles.
- Map is **lazy-loaded** (dynamic import with `ssr: false`) so the heavy Leaflet
  bundle only loads when the LiveWeatherSection mounts.
- Shows the **26+ major Indian cities** required by the spec as clickable markers.
- On mount, fetches current weather for each of the 26 cities (paced at 600ms per
  request to stay well within Open-Meteo's fair-use rate limits).
- Clicking a marker selects that city and opens the detail panel below the map with
  current conditions + 24h hourly chart + 7-day daily chart + active alerts.
- Four **weather layers** can be toggled via the layer control above the map:
  - **Temperature** — markers colored blue → red based on °C
  - **Rainfall** — markers colored light blue → dark purple based on mm/hr
  - **Wind** — markers colored green → dark red based on km/h, plus an arrow showing
    wind direction at the active location
  - **Alerts** — alert overlays rendered as circles (radius scaled by severity)
- A **legend** in the bottom-left corner explains the color bands.
- **Zoom and pan** are supported natively by Leaflet (mouse wheel, drag, pinch).
- The existing SVG-based `IndiaMap.tsx` component (which shows the simulator's
  risk heatmap) is **untouched** and continues to render in its original position
  below the new section.

## 8. How frequently weather data refreshes

- **Server-side cache TTL**: `WEATHER_CACHE_TTL` ms (default 3 minutes). Within this
  window, repeated requests for the same location return cached data without hitting
  the upstream API.
- **Client-side auto-refresh**: `WEATHER_REFRESH_INTERVAL` ms (default 5 minutes).
  The browser re-fetches the active location's forecast + alerts on this cadence.
- **City batch refresh**: The map fetches fresh weather for all 26 cities on initial
  mount, paced at 600ms per request (so the full batch completes in ~15 seconds).
  A "Refresh" button is provided to re-run the batch on demand.
- **Failure handling**: If the upstream API fails (timeout, rate-limit, network
  error), the server returns the last successful response marked as `stale: true`.
  The UI surfaces a prominent amber banner. If no cached data exists at all, the
  service falls back to the simulator so the dashboard never blanks out — clearly
  marked with `providerName: "Simulator (fallback)"`.
- **Cache invalidation**: The runtime `?source=` override clears both caches so the
  next fetch reflects the new source immediately.

---

## Files Added (ADDITIVE)

```
src/
  services/
    weather/
      types.ts                              # Strongly-typed interfaces
      cache.ts                              # In-memory TTL cache
      weatherService.ts                     # Service facade (real | simulator | fallback)
      alertEngine.ts                        # Data-derived alert engine
      providers/
        types.ts                            # WeatherProvider interface
        wmoCodes.ts                         # WMO weather code decoder
        openMeteo.ts                        # Open-Meteo provider (default, no key)
        openWeatherMap.ts                   # OpenWeatherMap provider (optional, key)
        index.ts                            # Provider selector
  lib/
    india-cities.ts                         # 26+ cities dataset + search
    real-weather-store.ts                   # Isolated Zustand store
  hooks/
    useRealWeather.ts                       # Auto-refresh + error handling hook
  components/
    live-weather/
      LiveWeatherSection.tsx                # Top-level wrapper (lazy-loads map)
      LiveWeatherMap.tsx                    # Leaflet map component
      WeatherLayerControl.tsx               # Layer switcher
      LocationDetailPanel.tsx               # Detail panel below map
      ForecastChart.tsx                     # recharts hourly + daily charts
      RealWeatherAlerts.tsx                 # Alert sidebar
      DataSourceToggle.tsx                  # Real / Simulator toggle
  app/
    api/
      weather/
        current/route.ts                    # GET /api/weather/current
        forecast/route.ts                   # GET /api/weather/forecast
        alerts/route.ts                     # GET /api/weather/alerts
        locations/route.ts                  # GET /api/weather/locations
        health/route.ts                     # GET /api/weather/health
        source/route.ts                     # GET / POST /api/weather/source
```

## Files Modified (minimal, additive-only)

```
.env                          # Added new weather env vars (DATABASE_URL preserved)
src/app/page.tsx              # Added LiveWeatherSection import + 1 new section
package.json                  # Added deps: leaflet, react-leaflet, @types/leaflet
```

## Files NOT Modified (explicitly preserved)

```
prisma/schema.prisma                                     # Database schema untouched
src/lib/weather-engine.ts                               # Existing simulator untouched
src/lib/locations.ts                                    # Existing INDIA_STATES untouched
src/lib/store.ts                                        # Existing Zustand store untouched
src/lib/useWeatherSocket.ts                              # Existing WebSocket hook untouched
src/lib/types.ts                                        # Existing types untouched
src/lib/translations.ts                                  # Existing translations untouched
mini-services/weather-simulator/*                        # Existing WS mini-service untouched
src/components/Header.tsx                                # Existing header untouched
src/components/IndiaMap.tsx                              # Existing SVG map untouched
src/components/CurrentWeather.tsx                       # Existing widgets untouched
src/components/HourlyTimeline.tsx                        # …
src/components/HazardScores.tsx                         # …
src/components/WarningCard.tsx                          # …
src/components/RecommendedActions.tsx                    # …
src/components/SystemStatus.tsx                         # …
src/components/AlertSimulation.tsx                      # …
src/components/AdminDashboard.tsx                       # …
src/components/ArchitectureDiagram.tsx                  # …
src/components/RiskRecalculation.tsx                    # …
src/components/Hero.tsx                                  # …
src/components/LocationSelector.tsx                    # …
```

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `leaflet` | ^1.9.4 | Open-source mapping library (no API key) |
| `react-leaflet` | ^5.0.0 | React bindings for Leaflet (React 19 compatible) |
| `@types/leaflet` | ^1.9.22 | TypeScript types for Leaflet |

## Weather API Provider Used

- **Default**: Open-Meteo — `https://api.open-meteo.com`
  - Free, no API key, no signup required
  - Commercial use allowed
  - Provides current + hourly (7 days) + daily (7 days) forecasts
  - No native severe-weather alerts — these are **derived** by our `alertEngine.ts`
    from the forecast data (clearly labeled `data_derived` in the UI)
- **Optional**: OpenWeatherMap — `https://api.openweathermap.org`
  - Free tier covers One Call API 2.5
  - **Requires** `WEATHER_API_KEY`
  - Provides **official** severe-weather alerts from national weather services
    (labeled `provider_official` in the UI)
- The UI **visually distinguishes** official vs derived alerts.

## How to switch between real and simulated weather

Three ways:

1. **Edit `.env`** and set `WEATHER_DATA_SOURCE=real` or `simulator`, then restart.
2. **Use the UI toggle** in the Live Weather section sidebar — instant, no restart.
3. **POST to `/api/weather/source`** with `{"source": "real"}` or `{"source": "simulator"}`.

The runtime override (options 2 & 3) is in-memory and resets on server restart, at
which point the `.env` value takes over.

## Limitations and API-rate considerations

1. **Open-Meteo** has no published rate limit, but its fair-use policy discourages
   bulk scraping. We pace city-batch requests at 600ms apart (15s for 26 cities).
2. **OpenWeatherMap free tier** allows 60 calls/min and 1,000,000 calls/month.
   The default cache TTL (3 min) + refresh interval (5 min) means a single user
   makes ~12 calls/hour per location. For multi-user deployments, consider raising
   `WEATHER_CACHE_TTL` to 5–10 minutes.
3. **Open-Meteo does not provide official severe-weather alerts.** Alerts shown
   for Open-Meteo are derived from forecast data by our heuristic engine. They
   are NOT official government warnings. Always defer to IMD / NDMA advisories.
4. **OpenWeatherMap One Call API 3.0** (which includes official alerts) requires
   a separate subscription (free tier: 1000 calls/day). The current
   implementation uses One Call API **2.5** (free) which does include alerts for
   many regions.
5. **The existing WebSocket simulator** continues to push `weather_update` and
   `alert_triggered` events to the existing dashboard widgets even when the
   live-weather module is in real mode. The two pipelines are independent.
6. **Leaflet bundle size** is ~140KB gzipped. It is lazy-loaded (dynamic import
   with `ssr: false`) so it only loads when the LiveWeatherSection mounts. The
   existing dashboard loads immediately without being blocked.
7. **Cache memory** is bounded at 500 entries per cache (forecast + alerts
   separately). Oldest entries are dropped every 60 seconds if the cache grows
   beyond this limit.

## Live map colour + current-weather sync fix

- Added batched nationwide current-weather endpoint (`/api/weather/map-data`) for map colouring.
- Leaflet Temperature / Rainfall / Wind / Risk layers now use current live values instead of a single static marker colour.
- Risk / Alerts shows visible coloured halos for Low, Moderate, Elevated, High, Very High and Extreme values.
- Original India Risk Map now consumes the same live nationwide weather feed in Real API mode and uses layer-specific legends.
- Selected-location current weather, timeline, warning/risk and recommended-action widgets prefer the real forecast when available.
- Real API default: Open-Meteo; 1-minute auto-refresh; 30-second selected-location cache.
- Simulator data remains available as a clearly labelled fallback/demo path and is not presented as live provider data.

## Live map + GPS accuracy update

See `LIVE_ACCURACY_FIX_NOTES.txt` for the latest fixes: visible colour zones, exact GPS coordinates, 60-second app sync, tighter caching, and real-provider/demo separation.
