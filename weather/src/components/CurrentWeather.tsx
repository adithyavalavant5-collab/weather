'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { adaptRealForecastForDashboard } from '@/lib/real-dashboard-weather'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { t } from '@/lib/translations'
import {
  generateForecast, formatClock, riskLevelFromScore, riskColor, riskBgClass, riskTextClass,
} from '@/lib/weather-engine'
import { Random, locationSeed } from '@/lib/weather-engine'
import {
  Thermometer, Droplets, Wind, Gauge, Eye, CloudRain, Cloud, Compass, Sun,
  RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react'

interface Props {
  liveRiskOverride?: number
  trendOverride?: 'rising' | 'falling' | 'stable' | null
  deltaOverride?: number
}

export function CurrentWeather({ liveRiskOverride, trendOverride, deltaOverride }: Props) {
  const { location, language, now, liveTick } = useAppStore()
  const lang = language
  const realForecast = useRealWeatherStore(state => state.forecast)

  const data = useMemo(() => {
    if (location && realForecast?.locationId === location.id && realForecast.dataSource === 'real') {
      return adaptRealForecastForDashboard(realForecast)
    }
    if (!location) return null
    const seed = locationSeed(location)
    // Incorporate liveTick so re-render picks up WS-driven changes
    const adjustedNow = new Date(now + liveTick * 1000)
    const rng = new Random(seed + Math.floor(adjustedNow.getTime() / (60 * 1000)))
    return generateForecast(location, adjustedNow, rng)
  }, [location, now, liveTick, realForecast])

  if (!location || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Select a location to view live weather.
        </CardContent>
      </Card>
    )
  }

  const usingReal = realForecast?.locationId === location.id && realForecast.dataSource === 'real'
  const { current } = data
  const liveRisk = liveRiskOverride ?? data.overallRisk
  const liveLevel = riskLevelFromScore(liveRisk)
  const trend = trendOverride ?? null
  const delta = deltaOverride ?? 0

  const weatherMetrics = [
    { icon: Thermometer, label: t(lang, 'temperature'), value: `${current.temperature}°C`, sub: `Feels ${current.feelsLike}°C`, color: 'text-orange-500' },
    { icon: CloudRain, label: t(lang, 'rainfall'), value: `${current.rainfall} mm/h`, sub: `Intensity: ${current.rainfallIntensity}`, color: 'text-blue-500' },
    { icon: Wind, label: t(lang, 'wind'), value: `${current.windSpeed} km/h`, sub: `${current.windDirection}° ${compassDir(current.windDirection)}`, color: 'text-cyan-500' },
    { icon: Droplets, label: t(lang, 'humidity'), value: `${current.humidity}%`, sub: current.humidity > 75 ? 'High' : current.humidity < 40 ? 'Low' : 'Comfortable', color: 'text-teal-500' },
    { icon: Gauge, label: t(lang, 'pressure'), value: `${current.pressure} hPa`, sub: current.pressure < 1000 ? 'Falling' : current.pressure > 1015 ? 'Rising' : 'Steady', color: 'text-purple-500' },
    { icon: Eye, label: t(lang, 'visibility'), value: `${current.visibility} km`, sub: current.visibility < 2 ? 'Poor' : current.visibility < 5 ? 'Reduced' : 'Good', color: 'text-slate-500' },
    { icon: Cloud, label: t(lang, 'cloud_cover'), value: `${current.cloudCover}%`, sub: current.cloudCover > 80 ? 'Overcast' : current.cloudCover > 50 ? 'Cloudy' : 'Partly cloudy', color: 'text-gray-500' },
    { icon: Compass, label: 'Wind Dir.', value: compassDir(current.windDirection), sub: `${current.windDirection}°`, color: 'text-indigo-500' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-amber-500" />
            {t(lang, 'current_weather')}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant={usingReal ? 'secondary' : 'outline'} className="text-[10px]">
              {usingReal ? `REAL · ${realForecast?.providerName ?? 'Provider'}` : 'DEMO'}
            </Badge>
            <RefreshCw className="h-3 w-3 text-emerald-500 animate-spin-slow" />
            <span className="text-xs text-muted-foreground">
              {t(lang, 'last_updated')}: {formatClock(new Date(current.updatedAt), true)}
            </span>
            {trend && (
              <Badge variant="outline" className={`text-xs ${trend === 'rising' ? 'border-red-400 text-red-600' : trend === 'falling' ? 'border-emerald-400 text-emerald-600' : 'border-muted'}`}>
                {trend === 'rising' ? <TrendingUp className="h-3 w-3" /> : trend === 'falling' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {delta > 0 ? '+' : ''}{delta}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{current.condition}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Live risk meter */}
        <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground">{t(lang, 'current_risk')}</span>
            <Badge className={`${riskBgClass(liveLevel)} text-white text-xs`}>
              {liveLevel.toUpperCase()} — {liveRisk}/100
            </Badge>
          </div>
          <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${liveRisk}%`, background: riskColor(liveLevel) }}
            />
            {/* Threshold markers */}
            {[40, 60, 80, 90].map(thresh => (
              <div
                key={thresh}
                className="absolute top-0 bottom-0 w-px bg-black/30 dark:bg-white/30"
                style={{ left: `${thresh}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0</span><span>40</span><span>60</span><span>80</span><span>90</span><span>100</span>
          </div>
        </div>

        {/* Weather metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {weatherMetrics.map(m => {
            const Icon = m.icon
            return (
              <div
                key={m.label}
                className="rounded-md border bg-card p-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <Icon className={`h-3 w-3 ${m.color}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</span>
                </div>
                <div className="font-semibold text-sm tabular-nums">{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.sub}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function compassDir(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}
