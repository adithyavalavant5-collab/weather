'use client'

// ============================================================================
// LiveWeatherMap — wrapper that lazy-loads the client-only Leaflet map.
//
// CRITICAL SSR FIX:
// This file is the ONLY entry point to the Leaflet map. It uses next/dynamic
// with ssr:false to load LiveWeatherMapClient (which contains the leaflet
// imports). This file itself has ZERO leaflet imports, so even if Turbopack
// evaluates it on the server, no `window` reference is triggered.
//
// The previous version put the leaflet imports in LiveWeatherMap.tsx directly
// and used React.lazy + next/dynamic. Turbopack on Next.js 16 still evaluated
// the file on the server, causing "window is not defined". Splitting into two
// files is the bulletproof fix.
// ============================================================================

import dynamic from 'next/dynamic'
import { Loader2, Map as MapIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeatherLayerControl } from './WeatherLayerControl'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import type { UnifiedLocation } from '@/lib/india-cities'
import type { WeatherLayer, RealWeatherAlert, RealForecast } from '@/services/weather/types'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { useRealWeather } from '@/hooks/useRealWeather'
import { LocationDetailPanel } from './LocationDetailPanel'

function MapChunkLoading() {
  const [slow, setSlow] = useState(false)
  const { activeLat, activeLng } = useRealWeatherStore()

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3500)
    return () => window.clearTimeout(timer)
  }, [])

  const lat = activeLat ?? 22.59
  const lng = activeLng ?? 79.96
  const dLat = 7
  const dLng = 9
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`

  return (
    <div className="live-weather-map-shell relative isolate z-0 h-[500px] w-full overflow-hidden rounded-lg border bg-slate-950">
      {!slow ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/40">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs text-muted-foreground">Starting interactive map…</span>
        </div>
      ) : (
        <>
          <iframe
            title="OpenStreetMap fallback"
            src={src}
            className="h-full w-full border-0"
            loading="eager"
          />
          <div className="pointer-events-none absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-[10px] shadow">
            Lightweight map shown while the interactive layer finishes loading
          </div>
        </>
      )}
    </div>
  )
}

const LiveWeatherMapClient = dynamic(
  () => import('./LiveWeatherMapClient').then(m => ({ default: m.LiveWeatherMapClient })),
  {
    ssr: false,
    loading: () => <MapChunkLoading />,
  },
)

interface Props {
  layer: WeatherLayer
  onLayerChange: (l: WeatherLayer) => void
}

export function LiveWeatherMap({ layer, onLayerChange }: Props) {
  const {
    activeLocationId, forecast, alerts, status, lastError,
    isStale, isFallbackSimulator, health, lastForecastAt,
    activeLocationName,
  } = useRealWeatherStore()

  const { fetchForecast } = useRealWeather({ enabled: false })
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)

  const handleLocationClick = (loc: UnifiedLocation) => {
    setSelectedCityId(loc.id)

    // Keep the original dashboard, header, alerts and the real-weather module
    // synchronized when a user clicks any of the hundreds of map locations.
    useAppStore.getState().setLocation({
      id: loc.id,
      name: loc.name,
      state: loc.state,
      district: loc.district ?? loc.name,
      type: loc.type === 'state_capital' || loc.type === 'ut_capital'
        ? 'state_capital'
        : loc.type === 'district_hq'
          ? 'district_hq'
          : loc.type === 'town'
            ? 'town'
            : 'city',
      lat: loc.lat,
      lng: loc.lng,
      population: loc.population,
    })

    // Update immediately; LiveWeatherSection's store bridge will reaffirm it.
    useRealWeatherStore.getState().setActiveLocation({
      id: loc.id,
      name: loc.name,
      state: loc.state,
      lat: loc.lat,
      lng: loc.lng,
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapIcon className="h-5 w-5 text-emerald-500" />
              Live India Weather Map
              <Badge variant="outline" className="text-[10px]">
                {health?.dataSource === 'real' ? 'Real' : 'Simulator'}
              </Badge>
              {health?.providerName && (
                <Badge variant="secondary" className="text-[10px]">{health.providerName}</Badge>
              )}
            </CardTitle>
          </div>
          <WeatherLayerControl value={layer} onChange={onLayerChange} />

          {(isStale || status === 'error' || isFallbackSimulator) && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2 flex items-center gap-2 text-xs">
              <span className="text-amber-800 dark:text-amber-300">
                {isFallbackSimulator
                  ? lastError?.startsWith('Connecting to live')
                    ? 'Connecting to live weather — temporary local preview is clearly marked DEMO and will be replaced automatically.'
                    : `Real weather unavailable — showing simulator fallback. (${lastError ?? ''})`
                  : isStale
                    ? `Showing last successful data (stale). (${lastError ?? 'unknown'})`
                    : `Error: ${lastError ?? 'unknown'}`}
              </span>
            </div>
          )}

          {lastForecastAt && (
            <div className="text-[10px] text-muted-foreground">
              Last update: {new Date(lastForecastAt).toLocaleString('en-IN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
              })}
              {health?.refreshIntervalMs ? (
                <span> · auto-refresh every {Math.round((health.refreshIntervalMs / 1000) / 60)} min</span>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-2">
          <LiveWeatherMapClient
            layer={layer}
            alerts={alerts}
            forecast={forecast}
            activeLocationId={activeLocationId}
            weatherLoading={status === 'loading'}
            onLocationClick={handleLocationClick}
            onRefreshActive={() => { void fetchForecast(true) }}
          />
        </CardContent>
      </Card>

      {/* Detail panel — rendered OUTSIDE the map card so it doesn't get clipped
          by overflow-hidden and has its own scroll container. Shows even if
          forecast is loading (with a loading hint). */}
      {selectedCityId && (
        <LocationDetailPanel
          forecast={forecast}
          alerts={alerts}
          loading={status === 'loading' && !forecast}
          cityName={activeLocationName}
        />
      )}
    </>
  )
}

export default LiveWeatherMap
