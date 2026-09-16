'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useWeatherSocket } from '@/lib/useWeatherSocket'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { INDIA_STATES, findNearestLocation } from '@/lib/locations'
import { t } from '@/lib/translations'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { LocationSelector } from '@/components/LocationSelector'
import { IndiaMap } from '@/components/IndiaMap'
import { CurrentWeather } from '@/components/CurrentWeather'
import { HourlyTimeline } from '@/components/HourlyTimeline'
import { HazardScores } from '@/components/HazardScores'
import { WarningCard } from '@/components/WarningCard'
import { RecommendedActions } from '@/components/RecommendedActions'
import { SystemStatus } from '@/components/SystemStatus'
import { AlertSimulation } from '@/components/AlertSimulation'
import { AdminDashboard } from '@/components/AdminDashboard'
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram'
import { RiskRecalculation } from '@/components/RiskRecalculation'
import { LiveWeatherSection } from '@/components/live-weather/LiveWeatherSection'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CloudRain, MapPin, Clock, AlertTriangle, Activity, ShieldCheck,
  Radio, Footprints,
} from 'lucide-react'

export default function Home() {
  const {
    location, setLocation, viewMode, language, gpsPermission, setGpsPermission,
  } = useAppStore()
  const [locationOpen, setLocationOpen] = useState(false)

  const { connected, latestUpdate, latestAlert } = useWeatherSocket()

  // Auto-prompt for location on first mount if not set
  useEffect(() => {
    if (!location) {
      // Try silent GPS detection (without prompting) — just check permission state
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            if (result.state === 'granted') {
              setGpsPermission('granted')
              // Permission is already granted: use the exact device coordinate
              // automatically instead of silently falling back to the sample city.
              navigator.geolocation.getCurrentPosition((pos) => {
                if (useAppStore.getState().location) return
                const { latitude, longitude } = pos.coords
                const nearest = findNearestLocation(latitude, longitude)
                setLocation({
                  id: `gps-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
                  name: 'My Location',
                  state: nearest.state,
                  district: nearest.district || nearest.name,
                  type: 'city',
                  lat: Number(latitude.toFixed(6)),
                  lng: Number(longitude.toFixed(6)),
                })
              }, () => { /* manual selector remains available */ }, {
                enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
              })
            } else if (result.state === 'denied') setGpsPermission('denied')
          })
          .catch(() => { /* permission API may not be supported */ })
      }
    }
    // Only run once on mount
  }, [])

  // Default to a sample Indian location if user hasn't picked one after 1.5s
  useEffect(() => {
    if (!location) {
      const timer = setTimeout(() => {
        // Do not overwrite a GPS/search selection that arrived while the timer was waiting.
        if (useAppStore.getState().location) return
        // Auto-select Dindigul (the example from the spec) only as a final demo fallback.
        const dindigul = {
          id: 'tn-dindigul',
          name: 'Dindigul',
          state: 'Tamil Nadu',
          district: 'Dindigul',
          type: 'district_hq' as const,
          lat: 10.3673,
          lng: 77.9803,
        }
        setLocation(dindigul)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [location, setLocation])

  const handlePickStateFromMap = (stateCode: string) => {
    const state = INDIA_STATES.find(s => s.code === stateCode)
    if (!state || state.districts.length === 0) return
    const d = state.districts[0]
    setLocation({
      id: `${state.code}-${d.name}`.replace(/\s+/g, '-').toLowerCase(),
      name: d.hq,
      state: state.name,
      district: d.name,
      type: 'district_hq',
      lat: d.lat,
      lng: d.lng,
    })
  }

  const lang = language

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Header onOpenLocation={() => setLocationOpen(true)} />

      <LocationSelector open={locationOpen} onOpenChange={setLocationOpen} />

      <main className="flex-1 px-3 md:px-5 py-4 space-y-3 max-w-[1600px] mx-auto w-full">
        {/* Connection status banner — informational, not blocking */}
        {!connected && (
          <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-2 flex items-center gap-2 text-xs">
            <Radio className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="text-blue-700 dark:text-blue-300">
              <strong>HYBRID DATA MODE:</strong> Current weather, map colours and selected-location forecast use the configured live weather API when available.
              The ConvLSTM-style pipeline and multi-channel delivery remain simulated for the demo.
              {connected ? ' WebSocket simulator stream connected.' : ' Connect Kafka/MQTT/WebSocket to replace the simulated ingestion pipeline.'}
            </span>
          </div>
        )}

        {/* Hero only shown when no location selected */}
        {!location && (
          <Hero onOpenLocation={() => setLocationOpen(true)} />
        )}

        {/* NEW ADDITIVE SECTION: Live India Weather Map + Real API integration.
            This is completely isolated from the existing dashboard below —
            the existing widgets (WarningCard, IndiaMap, CurrentWeather, etc.)
            continue to render exactly as before. */}
        <LiveWeatherSection />

        {/* Citizen or Admin view */}
        {viewMode === 'citizen' ? (
          <CitizenView
            location={location}
            onPickState={handlePickStateFromMap}
            socketConnected={connected}
            latestUpdate={latestUpdate}
            latestAlert={latestAlert}
            lang={lang}
          />
        ) : (
          <AdminView
            onPickState={handlePickStateFromMap}
            socketConnected={connected}
            latestAlert={latestAlert}
            lang={lang}
          />
        )}
      </main>

      <Footer lang={lang} />
    </div>
  )
}

function CitizenView({ location, onPickState, socketConnected, latestUpdate, latestAlert, lang }: {
  location: any
  onPickState: (code: string) => void
  socketConnected: boolean
  latestUpdate: any
  latestAlert: any
  lang: any
}) {
  // Never let the demo WebSocket overwrite real-provider weather/risk.
  // The WS stream remains useful for the simulated ingestion/delivery demo,
  // but when a real forecast is active the visible risk widgets are derived
  // from the same real forecast so all panels stay numerically consistent.
  const realForecast = useRealWeatherStore(s => s.forecast)
  const weatherHealth = useRealWeatherStore(s => s.health)
  const realWeatherActive = weatherHealth?.dataSource === 'real' && realForecast?.dataSource === 'real'
  const liveRisk = realWeatherActive ? undefined : latestUpdate?.risk
  const prevRisk = realWeatherActive ? undefined : latestUpdate?.prevRisk
  const trend = realWeatherActive ? undefined : latestUpdate?.trend
  const delta = realWeatherActive ? undefined : latestUpdate?.delta

  return (
    <>
      {/* Top row: Warning + Risk Map */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        <div className="space-y-3">
          {location ? (
            <WarningCard
              liveRiskOverride={liveRisk}
              trendOverride={trend}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                Select a location to view live warnings.
              </CardContent>
            </Card>
          )}
          <IndiaMap onPickState={onPickState} />
        </div>

        {/* Right column: System Status + Alert Sim */}
        <div className="space-y-3">
          <SystemStatus socketConnected={socketConnected} />
          <AlertSimulation latestAlert={latestAlert} />
        </div>
      </div>

      {/* Second row: Current Weather + Hourly Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        <CurrentWeather
          liveRiskOverride={liveRisk}
          trendOverride={trend}
          deltaOverride={delta}
        />
        <HourlyTimeline liveRiskOverride={liveRisk} />
      </div>

      {/* Third row: Hazard Scores + Recommended Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        <HazardScores liveRiskOverride={liveRisk} />
        <RecommendedActions liveRiskOverride={liveRisk} />
      </div>

      {/* Fourth row: Risk Recalculation + Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RiskRecalculation
          latestRisk={liveRisk}
          prevRisk={prevRisk}
          triggered={latestAlert != null}
        />
        <ArchitectureDiagram />
      </div>
    </>
  )
}

function AdminView({ onPickState, socketConnected, latestAlert, lang }: {
  onPickState: (code: string) => void
  socketConnected: boolean
  latestAlert: any
  lang: any
}) {
  return (
    <>
      {/* India map + admin dashboard side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        <div className="space-y-3">
          <IndiaMap onPickState={onPickState} />
          <SystemStatus socketConnected={socketConnected} />
          <AlertSimulation latestAlert={latestAlert} />
        </div>
        <AdminDashboard onPickState={onPickState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ArchitectureDiagram />
        <RiskRecalculation
          triggered={latestAlert != null}
        />
      </div>
    </>
  )
}

function Footer({ lang }: { lang: any }) {
  return (
    <footer className="mt-auto border-t bg-card/50 backdrop-blur">
      <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-medium">{t(lang, 'app_title')}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              <Footprints className="h-2.5 w-2.5 mr-1" />
              Hyper-local ~1 km grid · 0-6 hour rolling nowcast
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <ShieldCheck className="h-2.5 w-2.5 mr-1" />
              SMS · IVR · Siren · Push · Authority Dashboard
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <Radio className="h-2.5 w-2.5 mr-1" />
              11 Indian languages
            </Badge>
            <span className="opacity-70">SIH Prototype · {t(lang, 'demo_data_label')}</span>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] opacity-70 italic">
          &ldquo;{t(lang, 'tagline')}&rdquo; — {t(lang, 'differentiator')}
        </p>
      </div>
    </footer>
  )
}
