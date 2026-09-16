'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { adaptRealForecastForDashboard } from '@/lib/real-dashboard-weather'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip'
import { t, hazardLabel } from '@/lib/translations'
import {
  generateForecast, riskColor, riskLevelFromScore, locationSeed, Random,
} from '@/lib/weather-engine'
import { HazardType } from '@/lib/types'
import {
  CloudRain, Zap, CloudLightning, Cloud, Wind, Waves, Snowflake, AlertTriangle,
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

export function HazardScores({ liveRiskOverride }: Props) {
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
    return null
  }

  const overallRisk = liveRiskOverride ?? data.overallRisk
  const hazards = data.hazards

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {t(lang, 'hazard_scores')}
          </CardTitle>
          <Badge className="text-xs" variant="outline">
            {t(lang, 'overall_risk')}: <span className="font-bold ml-1" style={{ color: riskColor(riskLevelFromScore(overallRisk)) }}>{overallRisk}/100</span>
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Live API weather drives these scores when available · otherwise the demo risk engine is used
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <TooltipProvider delayDuration={200}>
          {hazards.map(h => {
            const Icon = HAZARD_ICON[h.hazard]
            const level = riskLevelFromScore(h.risk)
            return (
              <div key={h.hazard} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0 w-[120px]">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: riskColor(level) }} />
                  <span className="text-xs font-medium truncate">
                    {hazardLabel(lang, h.hazard)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${h.probability}%`, background: riskColor(level) }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tabular-nums w-[100px] justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-semibold text-foreground">{h.probability}%</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Probability: {h.probability}% · Severity: {h.severity}/100</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="opacity-50">·</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">C:{h.confidence}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Confidence proxy: {h.confidence}% (weather-model derived)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
