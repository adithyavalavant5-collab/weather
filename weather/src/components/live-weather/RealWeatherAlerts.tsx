'use client'

// ============================================================================
// RealWeatherAlerts — sidebar / inline list of active alerts for the
// currently-selected live-weather location. Visually distinguishes
// `provider_official` alerts (top) from `data_derived` alerts (bottom).
// ============================================================================

import { useMemo } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, ShieldCheck, RefreshCw, Loader2, Info,
} from 'lucide-react'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { useRealWeather } from '@/hooks/useRealWeather'
import type { RealWeatherAlert } from '@/services/weather/types'

export function RealWeatherAlerts() {
  const {
    alerts, status, activeLocationName, activeLocationState,
    isStale, lastForecastAt,
  } = useRealWeatherStore()
  const { fetchForecast } = useRealWeather({ enabled: false })

  const active = useMemo(
    () => alerts.filter(a => a.endsAt == null || a.endsAt > Date.now()),
    [alerts],
  )
  const official = active.filter(a => a.source === 'provider_official')
  const derived = active.filter(a => a.source === 'data_derived')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Real-Weather Alerts
            {active.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">{active.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => fetchForecast(true)}
            title="Force-refresh alerts"
          >
            {status === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline ml-1">Refresh</span>
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {activeLocationName ? (
            <>
              {activeLocationName} · {activeLocationState}
              {lastForecastAt && (
                <span className="ml-2">
                  · updated {new Date(lastForecastAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                </span>
              )}
              {isStale && <span className="ml-2 text-amber-600">· STALE</span>}
            </>
          ) : (
            <span>Pick a location on the map to view its alerts.</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {active.length === 0 ? (
          activeLocationName ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              No active alerts — weather is within safe thresholds for {activeLocationName}.
            </div>
          ) : (
            <div className="text-muted-foreground italic text-[10px] flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              Click any city marker on the map to fetch its real-weather alerts. Alerts are
              derived from the same API response (heavy rain, thunderstorm, strong winds,
              extreme temps, cyclone-force winds, flood risk, humidex).
            </div>
          )
        ) : (
          <>
            {official.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                  Official Provider Alerts
                </div>
                {official.map(a => <AlertCard key={a.id} alert={a} />)}
              </div>
            )}
            {derived.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                  Data-Derived Alerts (in-app engine)
                </div>
                {derived.map(a => <AlertCard key={a.id} alert={a} />)}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground italic flex items-start gap-1 pt-1 border-t">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                <strong>Important:</strong> Data-derived alerts are heuristic estimates
                based on API weather data, NOT official government warnings. Always defer
                to IMD / NDMA / local authority advisories for authoritative decisions.
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AlertCard({ alert }: { alert: RealWeatherAlert }) {
  const sevColor =
    alert.severity === 'extreme'
      ? 'bg-red-700 text-white border-red-300 dark:border-red-800 dark:bg-red-950/40'
      : alert.severity === 'severe'
        ? 'bg-red-500 text-white border-red-200 dark:border-red-800 dark:bg-red-950/30'
        : alert.severity === 'moderate'
          ? 'bg-orange-500 text-white border-orange-200 dark:border-orange-800 dark:bg-orange-950/30'
          : 'bg-yellow-400 text-black border-yellow-200 dark:border-yellow-800 dark:bg-yellow-950/30'

  return (
    <div className={`rounded-md border p-2 ${sevColor}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className="text-[9px] bg-black/20 text-white">
          {alert.severity.toUpperCase()}
        </Badge>
        <Badge className="text-[9px] bg-white/20 text-white">
          {alert.source === 'provider_official' ? 'OFFICIAL' : 'DERIVED'}
        </Badge>
        <span className="font-semibold">{alert.headline}</span>
      </div>
      <p className="mt-1 text-[11px]">{alert.description}</p>
      <p className="mt-1 text-[10px] italic opacity-80">Reason: {alert.reason}</p>
      <div className="mt-1 text-[10px] opacity-80">
        Start: {new Date(alert.startsAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
        {alert.endsAt ? (
          <> · End: {new Date(alert.endsAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</>
        ) : null}
        <> · Issued: {new Date(alert.issuedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</>
      </div>
    </div>
  )
}
