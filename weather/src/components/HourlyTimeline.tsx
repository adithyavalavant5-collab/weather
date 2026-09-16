'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { adaptRealForecastForDashboard } from '@/lib/real-dashboard-weather'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t, hazardLabel, riskLevelLabel } from '@/lib/translations'
import {
  generateForecast, riskColor, riskBgClass, riskLevelFromScore, locationSeed, Random,
} from '@/lib/weather-engine'
import { HazardType } from '@/lib/types'
import {
  CloudRain, Zap, CloudLightning, Cloud, Wind, Snowflake, Waves,
  TrendingUp, ArrowRight, AlertTriangle, Clock,
} from 'lucide-react'

const HAZARD_ICON: Record<HazardType, typeof Cloud> = {
  heavy_rain: CloudRain, extreme_rain: CloudRain,
  flash_flood: Waves, flood: Waves, cloudburst: CloudRain,
  thunderstorm: CloudLightning, lightning: Zap,
  hail: Snowflake, high_wind: Wind, squall: Wind,
  cyclone: Wind, normal: Cloud,
}

interface Props {
  liveRiskOverride?: number
}

export function HourlyTimeline({ liveRiskOverride }: Props) {
  const { location, language, now, liveTick } = useAppStore()
  const lang = language
  const realForecast = useRealWeatherStore(state => state.forecast)

  const data = useMemo(() => {
    if (location && realForecast?.locationId === location.id && realForecast.dataSource === 'real') {
      return adaptRealForecastForDashboard(realForecast)
    }
    if (!location) return null
    const seed = locationSeed(location)
    const adjustedNow = new Date(now + liveTick * 1000)
    const rng = new Random(seed + Math.floor(adjustedNow.getTime() / (60 * 1000)))
    return generateForecast(location, adjustedNow, rng)
  }, [location, now, liveTick, realForecast])

  if (!location || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Select a location to view the 6-hour forecast.
        </CardContent>
      </Card>
    )
  }

  const hourly = data.hourly
  // If we have a live risk override, blend it into NOW (without mutating the original)
  const displayHourly = liveRiskOverride !== undefined
    ? hourly.map((h, i) => i === 0
        ? { ...h, risk: liveRiskOverride, riskLevel: riskLevelFromScore(liveRiskOverride) }
        : h)
    : hourly

  const peakHour = displayHourly.reduce((max, h, i) => h.risk > displayHourly[max].risk ? i : max, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-orange-500" />
            {t(lang, 'six_hour_timeline')}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Rolling Window · NOW → +6 HR
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Horizontal scrollable timeline */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {displayHourly.map((h, i) => {
            const Icon = HAZARD_ICON[hazardIconKey(h.hazard)]
            const isPeak = i === peakHour
            const isNow = i === 0
            const isExtreme = h.riskLevel === 'extreme' || h.riskLevel === 'very_high'
            return (
              <div
                key={i}
                className={`relative shrink-0 w-[112px] rounded-lg border-2 p-2.5 snap-start transition-all ${
                  isPeak
                    ? 'border-orange-500 shadow-md shadow-orange-500/20'
                    : isNow
                      ? 'border-emerald-500'
                      : 'border-border'
                }`}
                style={{
                  background: isExtreme
                    ? `linear-gradient(180deg, ${riskColor(h.riskLevel)}22, transparent)`
                    : undefined,
                }}
              >
                {/* Header: time / NOW */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {isNow ? t(lang, 'now') : `+${h.hourOffset} ${t(lang, 'hour')}`}
                    </span>
                    <span className="text-[11px] font-mono font-medium tabular-nums">{h.timeLabel}</span>
                  </div>
                  {isNow && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                  {isPeak && !isNow && (
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                  )}
                </div>

                {/* Hazard icon + label */}
                <div className="flex items-center gap-1 mb-1.5">
                  <Icon
                    className="h-4 w-4"
                    style={{ color: riskColor(h.riskLevel) }}
                  />
                  <span className="text-xs font-semibold leading-tight">
                    {hazardLabel(lang, h.hazard)}
                  </span>
                </div>

                {/* Risk badge */}
                <div
                  className={`${riskBgClass(h.riskLevel)} text-white text-[10px] font-bold uppercase rounded px-1.5 py-0.5 text-center`}
                >
                  {h.riskLevel.replace('_', ' ')} · {h.risk}
                </div>

                {/* Stats */}
                <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>P:</span>
                    <span className="font-medium tabular-nums">{h.probability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>C:</span>
                    <span className="font-medium tabular-nums">{h.confidence}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Arrow chain visualization */}
        <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground overflow-x-auto pb-1">
          {displayHourly.map((h, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div
                className="h-6 w-6 rounded flex items-center justify-center text-white text-[9px] font-bold"
                style={{ background: riskColor(h.riskLevel) }}
              >
                {h.risk}
              </div>
              {i < displayHourly.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />}
            </div>
          ))}
        </div>

        {/* Recommended action banner */}
        <div className="mt-3 rounded-md bg-muted/50 p-2.5 border-l-4 border-orange-500">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold mb-0.5">{t(lang, 'recommended_action')} (Peak Hour)</p>
              <p className="text-xs text-muted-foreground">{hourly[peakHour].recommendedAction}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function hazardIconKey(h: HazardType): HazardType {
  return h
}
