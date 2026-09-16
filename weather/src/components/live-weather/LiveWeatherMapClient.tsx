'use client'

// ============================================================================
// LiveWeatherMapClient — client-only Leaflet map.
//
// India-wide coverage changes:
// - Renders every bundled Indian city/district-HQ location (not just 30).
// - Uses Leaflet's Canvas renderer for the hundreds of lightweight location
//   dots, keeping mobile/low-end performance substantially better than using
//   hundreds of DOM Marker icons.
// - Any additional place found through the India-wide search appears through
//   the selected-location marker, even when it is not in the bundled dataset.
// - Weather is still fetched ON DEMAND for the selected location; we never
//   issue hundreds of weather requests at startup.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ALL_UNIFIED_LOCATIONS } from '@/lib/india-cities'
import type { UnifiedLocation } from '@/lib/india-cities'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import type {
  ApiResponse,
  MapWeatherPayload,
  MapWeatherPoint,
  RealForecast,
  RealWeatherAlert,
  WeatherLayer,
} from '@/services/weather/types'
import { degreesToCompass } from '@/services/weather/providers/wmoCodes'
import { colorForMapLayer, labelForMapLayer, mapRiskLevel, weatherRiskScore } from '@/services/weather/mapRisk'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, RefreshCw, WifiOff } from 'lucide-react'

const selectedLocationIcon = L.divIcon({
  className: 'selected-location-marker',
  html: `<div style="position:relative;width:24px;height:24px">
    <div style="position:absolute;inset:0;border-radius:50%;background:#f97316;opacity:.4;animation:pulsemarker 1.6s ease-out infinite"></div>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,.4)"></div>
  </div>
  <style>@keyframes pulsemarker{0%{transform:scale(.7);opacity:.6}70%{transform:scale(1.6);opacity:0}100%{opacity:0}}</style>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function MapResizeGuard() {
  const map = useMap()

  useEffect(() => {
    let firstTimer: ReturnType<typeof setTimeout> | null = null
    let secondTimer: ReturnType<typeof setTimeout> | null = null
    let frame = 0

    const refreshSize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }))
    }

    firstTimer = setTimeout(refreshSize, 0)
    secondTimer = setTimeout(refreshSize, 220)
    const container = map.getContainer()
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(refreshSize)
      : null
    observer?.observe(container)

    window.addEventListener('resize', refreshSize)
    return () => {
      if (firstTimer) clearTimeout(firstTimer)
      if (secondTimer) clearTimeout(secondTimer)
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', refreshSize)
    }
  }, [map])

  return null
}

function RecenterOnActive() {
  const { activeLat, activeLng } = useRealWeatherStore()
  const map = useMap()

  useEffect(() => {
    if (activeLat == null || activeLng == null) return
    map.invalidateSize({ pan: false })
    map.stop()
    map.flyTo([activeLat, activeLng], Math.max(map.getZoom(), 8), { duration: 0.7 })
  }, [activeLat, activeLng, map])

  return null
}

interface ClientProps {
  layer: WeatherLayer
  alerts: RealWeatherAlert[]
  forecast: RealForecast | null
  activeLocationId: string | null
  weatherLoading: boolean
  onLocationClick: (location: UnifiedLocation) => void
  onRefreshActive: () => void
}

type TileProvider = 'osm' | 'carto'


function coverageRadiusForLayer(layer: WeatherLayer, point: MapWeatherPoint): number {
  if (layer === 'temperature') return 44_000
  if (layer === 'precipitation') {
    if (point.precipitation >= 12) return 52_000
    if (point.precipitation >= 2.5) return 44_000
    return 34_000
  }
  if (layer === 'wind') {
    const peak = Math.max(point.windSpeed, point.windGusts ?? 0)
    if (peak >= 62) return 52_000
    if (peak >= 40) return 46_000
    return 36_000
  }
  if (point.riskScore > 90) return 65_000
  if (point.riskScore > 80) return 56_000
  if (point.riskScore > 60) return 48_000
  if (point.riskScore > 40) return 40_000
  if (point.riskScore > 20) return 34_000
  return 28_000
}

function coverageOpacityForLayer(layer: WeatherLayer, point: MapWeatherPoint): number {
  if (layer === 'temperature') return 0.16
  if (layer === 'precipitation') {
    if (point.precipitation < 0.1) return 0.05
    if (point.precipitation < 2.5) return 0.12
    return 0.22
  }
  if (layer === 'wind') {
    const peak = Math.max(point.windSpeed, point.windGusts ?? 0)
    return peak >= 40 ? 0.22 : 0.14
  }
  return point.riskScore > 60 ? 0.25 : point.riskScore > 40 ? 0.19 : 0.12
}

export function LiveWeatherMapClient({
  layer,
  alerts,
  forecast,
  weatherLoading,
  onLocationClick,
  onRefreshActive,
}: ClientProps) {
  const {
    activeLocationId,
    activeLat,
    activeLng,
    activeLocationName,
    activeLocationState,
  } = useRealWeatherStore()

  const [tileProvider, setTileProvider] = useState<TileProvider>('osm')
  const [tileUnavailable, setTileUnavailable] = useState(false)
  const [mapWeather, setMapWeather] = useState<MapWeatherPayload | null>(null)
  const [mapWeatherLoading, setMapWeatherLoading] = useState(false)
  const [mapWeatherError, setMapWeatherError] = useState<string | null>(null)

  const loadMapWeather = useCallback(async (force = false) => {
    setMapWeatherLoading(true)
    try {
      const suffix = force ? `?_t=${Date.now()}` : ''
      const res = await fetch(`/api/weather/map-data${suffix}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Map weather HTTP ${res.status}`)
      const json = await res.json() as ApiResponse<MapWeatherPayload>
      if (!json.ok || !json.data) throw new Error(json.error || 'Live map weather unavailable')
      setMapWeather(json.data)
      setMapWeatherError(json.error ?? null)
    } catch (err) {
      // Keep the last good live layer visible if a refresh fails.
      setMapWeatherError(err instanceof Error ? err.message : 'Live map weather unavailable')
    } finally {
      setMapWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMapWeather(true)
    const timer = window.setInterval(() => { void loadMapWeather(true) }, 60_000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void loadMapWeather(true)
    }
    const onOnline = () => { void loadMapWeather(true) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [loadMapWeather])

  const mapWeatherById = useMemo(() => {
    const m = new Map<string, MapWeatherPoint>()
    for (const point of mapWeather?.points ?? []) m.set(point.id, point)
    return m
  }, [mapWeather])

  const handleTileError = useCallback(() => {
    if (tileProvider === 'osm') {
      setTileProvider('carto')
      setTileUnavailable(false)
    } else {
      setTileUnavailable(true)
    }
  }, [tileProvider])

  const tileUrl = tileProvider === 'osm'
    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const tileAttribution = tileProvider === 'osm'
    ? '&copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors &copy; CARTO'

  const selectedWeather =
    forecast && activeLocationId && forecast.locationId === activeLocationId
      ? forecast.current
      : null

  const selectedLayerPoint = useMemo<MapWeatherPoint | null>(() => {
    if (!selectedWeather) return null
    const riskScore = weatherRiskScore({
      temperature: selectedWeather.temperature,
      precipitation: selectedWeather.precipitation,
      windSpeed: selectedWeather.windSpeed,
      windGusts: selectedWeather.windGusts,
      weatherCode: selectedWeather.weatherCode,
    })
    return {
      id: selectedWeather.locationId,
      name: selectedWeather.locationName,
      state: selectedWeather.state,
      lat: selectedWeather.lat,
      lng: selectedWeather.lng,
      temperature: selectedWeather.temperature,
      humidity: selectedWeather.humidity,
      precipitation: selectedWeather.precipitation,
      windSpeed: selectedWeather.windSpeed,
      windGusts: selectedWeather.windGusts,
      weatherCode: selectedWeather.weatherCode,
      observedAt: selectedWeather.observedAt,
      riskScore,
      riskLevel: mapRiskLevel(riskScore),
    }
  }, [selectedWeather])

  return (
    <div className="live-weather-map-shell relative isolate z-0 h-[500px] w-full rounded-lg overflow-hidden border bg-slate-950">
      <MapContainer
        center={[22.59, 79.96]}
        zoom={5}
        minZoom={4}
        maxZoom={14}
        scrollWheelZoom={false}
        zoomControl={false}
        preferCanvas
        style={{ width: '100%', height: '100%', background: '#0b1220' }}
      >
        <TileLayer
          key={tileProvider}
          attribution={tileAttribution}
          url={tileUrl}
          eventHandlers={{ tileerror: handleTileError }}
        />
        <ZoomControl position="bottomright" />
        <MapResizeGuard />
        <RecenterOnActive />

        {/* Paint the measurement itself onto the map, not only into the legend
            or tiny city dots. These semi-transparent Canvas circles form a
            visible live weather field around every nationwide sample point. */}
        {(mapWeather?.points ?? []).map(point => {
          const colour = colorForMapLayer(layer, point)
          return (
            <Circle
              key={`weather-zone-${layer}-${point.id}`}
              center={[point.lat, point.lng]}
              radius={coverageRadiusForLayer(layer, point)}
              pathOptions={{
                color: colour,
                fillColor: colour,
                weight: 0,
                opacity: 0,
                fillOpacity: coverageOpacityForLayer(layer, point),
              }}
              interactive={false}
            />
          )
        })}

        {/* Exact selected/GPS point gets a stronger ring so the colour at the
            user's actual coordinate is unambiguous even between sample dots. */}
        {selectedLayerPoint && (
          <Circle
            center={[selectedLayerPoint.lat, selectedLayerPoint.lng]}
            radius={18_000}
            pathOptions={{
              color: colorForMapLayer(layer, selectedLayerPoint),
              fillColor: colorForMapLayer(layer, selectedLayerPoint),
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.30,
            }}
            interactive={false}
          />
        )}

        {/* Every bundled Indian city + district HQ is coloured from the
            current live weather sample for the selected layer. We fetch these
            points in a few multi-coordinate batches, NOT one request per city. */}
        {ALL_UNIFIED_LOCATIONS.map(loc => {
          const isActive = activeLocationId === loc.id
          const livePoint = mapWeatherById.get(loc.id)
          const fillColor = livePoint ? colorForMapLayer(layer, livePoint) : '#64748b'
          const valueLabel = livePoint ? labelForMapLayer(layer, livePoint) : 'Live sample unavailable'
          return (
            <CircleMarker
              key={`${loc.id}-${loc.lat}-${loc.lng}`}
              center={[loc.lat, loc.lng]}
              radius={isActive ? 7 : 5}
              pathOptions={{
                color: isActive ? '#111827' : 'rgba(255,255,255,.9)',
                weight: isActive ? 3 : 1,
                fillColor,
                fillOpacity: livePoint ? 0.9 : 0.45,
              }}
              eventHandlers={{ click: () => onLocationClick(loc) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.97}>
                <div className="text-xs min-w-[130px]">
                  <strong>{loc.name}</strong>
                  <div>{loc.district ? `${loc.district}, ` : ''}{loc.state}</div>
                  <div className="mt-1 font-semibold" style={{ color: fillColor }}>
                    {valueLabel}
                  </div>
                  {livePoint && (
                    <div className="text-[9px] opacity-70">
                      Updated {new Date(livePoint.observedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className="text-[10px] opacity-70">Click for full weather</div>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}

        {/* Provider/derived alert footprints are layered on top of the live risk field. */}
        {layer === 'alerts' && alerts.map(a => (
          <Circle
            key={a.id}
            center={[a.lat, a.lng]}
            radius={50000 + (a.severity === 'extreme' ? 80000 : a.severity === 'severe' ? 40000 : 15000)}
            pathOptions={{
              color: a.severity === 'extreme' ? '#7f1d1d' : a.severity === 'severe' ? '#dc2626' : '#f97316',
              fillColor: a.severity === 'extreme' ? '#7f1d1d' : a.severity === 'severe' ? '#dc2626' : '#f97316',
              fillOpacity: 0.35,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[200px]">
                <div className="font-semibold">{a.title}</div>
                <Badge>{a.severity}</Badge>
                <div className="text-[11px]">{a.description}</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Selected marker also covers remote search results that are not part
            of the bundled map list. Weather is fetched only for this point. */}
        {activeLat != null && activeLng != null && (
          <Marker
            position={[activeLat, activeLng]}
            icon={selectedLocationIcon}
            key={`sel-${activeLocationId ?? 'none'}-${activeLat}-${activeLng}`}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[210px]">
                <div className="font-semibold text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-orange-500" />
                  {activeLocationName || 'Selected location'}
                </div>
                {activeLocationState && (
                  <div className="text-[10px] text-muted-foreground">{activeLocationState}</div>
                )}

                {selectedWeather ? (
                  <div className="mt-2 space-y-1 text-[11px] border-t pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>🌡️ Temperature</span>
                      <strong>{selectedWeather.temperature}°C</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>💧 Humidity</span><span>{selectedWeather.humidity}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>🌬️ Wind</span>
                      <span>{selectedWeather.windSpeed} km/h {degreesToCompass(selectedWeather.windDirection)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>🌧️ Rain</span>
                      <span>{selectedWeather.precipitation} mm ({selectedWeather.precipitationProbability}%)</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t pt-1">
                      <span>{selectedWeather.conditionIcon ?? '🌦️'} {selectedWeather.condition}</span>
                      <span className="text-[9px] opacity-60">{selectedWeather.dataSource}</span>
                    </div>
                  </div>
                ) : weatherLoading ? (
                  <div className="flex items-center gap-1 border-t pt-2 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading weather…
                  </div>
                ) : (
                  <div className="border-t pt-2 text-[10px] text-muted-foreground">
                    Weather will load automatically for this location.
                  </div>
                )}

                <div className="text-[9px] text-muted-foreground pt-1 border-t">
                  {activeLat.toFixed(4)}, {activeLng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute top-2 left-2 z-[1001] max-w-[70%] rounded-md bg-background/90 px-2 py-1 text-[10px] shadow backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${mapWeather ? 'bg-emerald-500' : mapWeatherLoading ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
          <span>
            {mapWeather
              ? `${mapWeather.points.length} live India points · 60s sync · ${new Date(mapWeather.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : mapWeatherLoading
                ? 'Loading live colour layer…'
                : `${ALL_UNIFIED_LOCATIONS.length}+ India locations`}
          </span>
        </div>
        {mapWeatherError && <div className="mt-0.5 text-amber-700 dark:text-amber-300">{mapWeatherError}</div>}
      </div>

      <div className="absolute top-2 right-2 z-[1001]">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs shadow-md"
          onClick={() => { onRefreshActive(); void loadMapWeather(true) }}
          disabled={!activeLocationId || weatherLoading}
          title="Refresh selected location and nationwide live layer"
        >
          {weatherLoading
            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            : <RefreshCw className="h-3 w-3 mr-1" />}
          Refresh
        </Button>
      </div>

      {tileUnavailable && (
        <div className="absolute inset-x-3 top-12 z-[1001] rounded-md border border-amber-300 bg-amber-50/95 p-2 text-xs text-amber-900 shadow dark:bg-amber-950/95 dark:text-amber-100">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            Map tiles are temporarily unavailable. Weather data and location search can still work; check your internet connection and press Refresh.
          </div>
        </div>
      )}

      <Legend layer={layer} />
    </div>
  )
}

function Legend({ layer }: { layer: WeatherLayer }) {
  const stops: { color: string; label: string }[] =
    layer === 'temperature'
      ? [
          { color: '#1e3a8a', label: '< 5°C' },
          { color: '#0ea5e9', label: '5–12°C' },
          { color: '#22c55e', label: '12–18°C' },
          { color: '#84cc16', label: '18–25°C' },
          { color: '#eab308', label: '25–32°C' },
          { color: '#f97316', label: '32–38°C' },
          { color: '#ef4444', label: '38–42°C' },
          { color: '#991b1b', label: '≥ 42°C' },
        ]
      : layer === 'precipitation'
        ? [
            { color: '#cbd5e1', label: '< 0.1 mm' },
            { color: '#93c5fd', label: '0.1–2.5 mm' },
            { color: '#3b82f6', label: '2.5–7.5 mm' },
            { color: '#1d4ed8', label: '7.5–12 mm' },
            { color: '#6d28d9', label: '12–21 mm' },
            { color: '#a21caf', label: '≥ 21 mm' },
          ]
        : layer === 'wind'
          ? [
              { color: '#22c55e', label: '< 15 km/h' },
              { color: '#84cc16', label: '15–30 km/h' },
              { color: '#eab308', label: '30–40 km/h' },
              { color: '#f97316', label: '40–62 km/h' },
              { color: '#ef4444', label: '62–75 km/h' },
              { color: '#7f1d1d', label: '≥ 75 km/h' },
            ]
          : [
              { color: '#22c55e', label: 'Low 0–20' },
              { color: '#84cc16', label: 'Moderate 21–40' },
              { color: '#eab308', label: 'Elevated 41–60' },
              { color: '#f97316', label: 'High 61–80' },
              { color: '#ef4444', label: 'Very High 81–90' },
              { color: '#991b1b', label: 'Extreme 91–100' },
            ]

  return (
    <div className="absolute bottom-2 left-2 z-[1001] max-h-[46%] overflow-auto bg-black/75 backdrop-blur rounded p-2 text-xs text-white shadow-lg">
      <p className="font-semibold mb-1 opacity-80 capitalize">Live {layer === 'alerts' ? 'weather risk' : layer} layer</p>
      <div className="flex flex-col gap-1">
        {stops.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded shrink-0" style={{ background: s.color }} />
            <span className="opacity-90">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LiveWeatherMapClient
