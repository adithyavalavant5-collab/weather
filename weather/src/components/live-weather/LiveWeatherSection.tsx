'use client'

// ============================================================================
// LiveWeatherSection — top-level wrapper for the live-weather module.
// Bundles: LiveWeatherMap + DataSourceToggle + RealWeatherAlerts.
//
// BUG FIX: This component now SUBSCRIBES to useAppStore.location (the existing
// app-wide selected location) and forwards every change to useRealWeatherStore
// (which the Leaflet map reads to recenter + place the selected marker).
// Previously this component auto-selected Delhi once on mount and never
// synced again — that was why selecting Dindigul from the LocationSelector
// updated the weather widgets but left the map stuck on Delhi.
// ============================================================================

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { useRealWeather } from '@/hooks/useRealWeather'
import { useAppStore } from '@/lib/store'
import { DataSourceToggle } from './DataSourceToggle'
import { RealWeatherAlerts } from './RealWeatherAlerts'
import type { WeatherLayer } from '@/services/weather/types'
import { LiveWeatherMap } from './LiveWeatherMap'

export function LiveWeatherSection() {
  const { setActiveLocation } = useRealWeatherStore()
  useRealWeather()
  const [layer, setLayer] = useState<WeatherLayer>('temperature')

  // === SYNC BRIDGE: existing app store → new real-weather store ===
  // Read the existing app-wide selected location (set by LocationSelector,
  // GPS, IndiaMap state click, etc.) and forward it to the real-weather
  // store. The map reads activeLat/activeLng from the real-weather store
  // and recenters via the existing RecenterOnActive component.
  //
  // This is the SOLE point of coupling between the two stores. It is
  // intentionally one-directional (app → real-weather) so the existing
  // dashboard behavior is preserved exactly.
  const appLocation = useAppStore(s => s.location)

  useEffect(() => {
    if (appLocation) {
      setActiveLocation({
        id: appLocation.id,
        name: appLocation.name,
        state: appLocation.state,
        lat: appLocation.lat,
        lng: appLocation.lng,
      })
    }
  }, [appLocation, setActiveLocation])

  return (
    <section className="space-y-3">
      <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Live India Weather Map + Real API Integration
            </span>
            <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-700 dark:text-emerald-300">
              ADDITIVE
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">
            OpenStreetMap · Open-Meteo current weather · 1-min auto-sync · India-wide search
          </span>
        </div>
        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
          Map colours are painted directly onto the map as live weather zones, not only marker dots. Switch Temperature, Rainfall, Wind or Risk / Alerts to see the matching colour field. Exact GPS uses your real coordinates, and selected-location weather auto-syncs every minute.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        <LiveWeatherMap layer={layer} onLayerChange={setLayer} />
        <div className="space-y-3">
          <DataSourceToggle />
          <RealWeatherAlerts />
        </div>
      </div>
    </section>
  )
}

export default LiveWeatherSection
