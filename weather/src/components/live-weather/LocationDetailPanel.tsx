'use client'

// ============================================================================
// LocationDetailPanel — shows full weather detail for the clicked city.
// Renders: current conditions + 24h hourly forecast + 7-day daily forecast.
// Surfaced below the map.
// ============================================================================

import { useMemo } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Thermometer, Droplets, Wind, CloudRain, Gauge, Eye, Sun, Compass,
  Clock, Calendar, AlertTriangle, ShieldCheck, Info, Loader2,
} from 'lucide-react'
import type { RealForecast, RealWeatherAlert } from '@/services/weather/types'
import { ForecastChart } from './ForecastChart'
import { degreesToCompass } from '@/services/weather/providers/wmoCodes'

interface Props {
  forecast: RealForecast | null
  alerts: RealWeatherAlert[]
  loading?: boolean
  cityName?: string
}

export function LocationDetailPanel({ forecast, alerts, loading, cityName }: Props) {
  // Hooks must run in the same order on every render — so call useMemo up
  // front with safe fallbacks when forecast is null.
  const hourlyData = useMemo(
    () => (forecast ? forecast.hourly.slice(0, 24) : []),
    [forecast],
  )
  const dailyData = useMemo(
    () => (forecast ? forecast.daily.slice(0, 7) : []),
    [forecast],
  )

  // Loading state — show skeleton while waiting for the forecast
  if (!forecast || loading) {
    return (
      <Card className="mt-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-emerald-500" />
            {cityName ?? 'Loading…'}
            <Loader2 className="h-4 w-4 ml-1 animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Fetching live weather data from the provider…
        </CardContent>
      </Card>
    )
  }

  const { current, locationName, state, providerName, dataSource } = forecast

  const activeAlerts = alerts.filter(a => a.endsAt == null || a.endsAt > Date.now())

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-emerald-500" />
            {locationName}
            <span className="text-xs text-muted-foreground">· {state}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {dataSource === 'real' ? 'Real' : 'Simulator'}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">{providerName}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current conditions grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <Stat icon={Thermometer} color="text-orange-500" label="Temperature" value={`${current.temperature}°C`} />
          <Stat icon={Thermometer} color="text-orange-400" label="Feels like" value={`${current.feelsLike}°C`} />
          <Stat icon={Droplets} color="text-blue-500" label="Humidity" value={`${current.humidity}%`} />
          <Stat icon={Wind} color="text-emerald-500" label="Wind" value={`${current.windSpeed} km/h`} />
          <Stat icon={Compass} color="text-emerald-400" label="Wind dir." value={`${degreesToCompass(current.windDirection)} (${current.windDirection}°)`} />
          <Stat icon={CloudRain} color="text-blue-400" label="Precip." value={`${current.precipitation} mm`} />
          <Stat icon={Gauge} color="text-purple-500" label="Pressure" value={`${current.pressure} hPa`} />
          <Stat icon={Eye} color="text-slate-500" label="Visibility" value={`${(current.visibility / 1000).toFixed(1)} km`} />
          {current.uvIndex !== undefined && (
            <Stat icon={Sun} color="text-yellow-500" label="UV Index" value={String(current.uvIndex)} />
          )}
          <Stat icon={CloudRain} color="text-blue-400" label="Rain prob." value={`${current.precipitationProbability}%`} />
          {current.windGusts !== undefined && (
            <Stat icon={Wind} color="text-emerald-600" label="Wind gusts" value={`${current.windGusts} km/h`} />
          )}
        </div>

        {/* Condition row */}
        <div className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
          <span className="text-3xl">{current.conditionIcon ?? '☀️'}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{current.condition}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Observed: {new Date(current.observedAt).toLocaleString('en-IN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
              })}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Exact point: {forecast.lat.toFixed(5)}, {forecast.lng.toFixed(5)} · app sync every 60s
            </div>
          </div>
        </div>

        {/* Active alerts */}
        {activeAlerts.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Active Alerts ({activeAlerts.length})
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {activeAlerts.map(a => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            No active alerts for this location.
          </div>
        )}

        <Separator />

        {/* Hourly forecast chart */}
        {hourlyData.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              Next 24 hours — temperature & precipitation
            </div>
            <ForecastChart
              hourly={hourlyData}
              daily={[]}
              mode="hourly"
            />
          </div>
        )}

        <Separator />

        {/* 7-day forecast */}
        {dailyData.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              Next 7 days
            </div>
            <ForecastChart
              hourly={[]}
              daily={dailyData}
              mode="daily"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
            <Info className="h-3 w-3" />
            Daily forecast not available in simulator mode.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ icon: Icon, color, label, value }: {
  icon: typeof Thermometer
  color: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border p-2 text-center">
      <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${color}`} />
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  )
}

function AlertRow({ alert }: { alert: RealWeatherAlert }) {
  const severityColor =
    alert.severity === 'extreme' ? 'bg-red-700 text-white'
    : alert.severity === 'severe' ? 'bg-red-500 text-white'
    : alert.severity === 'moderate' ? 'bg-orange-500 text-white'
    : 'bg-yellow-400 text-black'
  return (
    <div className={`rounded-md border p-2 text-xs ${alert.severity === 'extreme' || alert.severity === 'severe' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-orange-200 bg-orange-50 dark:bg-orange-950/30'}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={`text-[9px] ${severityColor}`}>
          {alert.severity.toUpperCase()}
        </Badge>
        <Badge variant="secondary" className="text-[9px]">
          {alert.source === 'provider_official' ? 'Official' : 'Derived'}
        </Badge>
        <span className="font-semibold">{alert.headline}</span>
      </div>
      <p className="mt-1 text-[11px]">{alert.description}</p>
      <p className="mt-1 text-[10px] text-muted-foreground italic">
        Reason: {alert.reason}
      </p>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Start: {new Date(alert.startsAt).toLocaleString('en-IN')}
        {alert.endsAt ? ` · End: ${new Date(alert.endsAt).toLocaleString('en-IN')}` : ''}
        {' · Issued: '}{new Date(alert.issuedAt).toLocaleString('en-IN')}
      </div>
    </div>
  )
}
