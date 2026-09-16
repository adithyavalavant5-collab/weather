'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { adaptRealForecastForDashboard } from '@/lib/real-dashboard-weather'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t, hazardLabel, riskLevelLabel } from '@/lib/translations'
import {
  generateForecast, riskColor, riskLevelFromScore, riskBgClass, locationSeed, Random,
} from '@/lib/weather-engine'
import { HazardType } from '@/lib/types'
import {
  AlertOctagon, ShieldAlert, Clock, Target, Gauge, MapPin, Bell, ChevronRight,
} from 'lucide-react'

interface Props {
  liveRiskOverride?: number
  trendOverride?: 'rising' | 'falling' | 'stable' | null
}

export function WarningCard({ liveRiskOverride, trendOverride }: Props) {
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

  // Find the peak hour (highest risk in next 6h)
  const peak = data.hourly.reduce((max, h) => h.risk > max.risk ? h : max, data.hourly[0])
  const liveRisk = liveRiskOverride ?? peak.risk
  const level = riskLevelFromScore(liveRisk)
  const trending = trendOverride === 'rising'
  const isSevere = level === 'high' || level === 'very_high' || level === 'extreme'
  const bgColor = riskColor(level)
  const actionKey =
    level === 'extreme' ? t(lang, 'seek_shelter') :
    level === 'very_high' ? t(lang, 'seek_shelter') :
    level === 'high' ? t(lang, 'stay_indoors') :
    level === 'elevated' ? t(lang, 'monitor_situation') :
    t(lang, 'safe_conditions')

  return (
    <Card
      className={`overflow-hidden border-2 ${isSevere ? 'border-red-500/50' : 'border-border'} relative`}
      style={{
        background: isSevere
          ? `linear-gradient(135deg, ${bgColor}25, ${bgColor}10 50%, transparent)`
          : undefined,
      }}
    >
      {/* Pulsing alert indicator */}
      {isSevere && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <Badge variant="destructive" className="text-[10px] animate-pulse">
            LIVE
          </Badge>
        </div>
      )}

      <CardContent className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          {/* Big alert icon */}
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: bgColor }}
          >
            <AlertOctagon className="h-7 w-7 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Title */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base md:text-lg font-bold leading-tight">
                {isSevere ? (
                  <span className="uppercase tracking-tight">
                    {hazardLabel(lang, peak.hazard).toUpperCase()} WARNING
                  </span>
                ) : (
                  <span>
                    {t(lang, 'main_hazard')}: {hazardLabel(lang, peak.hazard)}
                  </span>
                )}
              </h2>
              <Badge
                className={`${riskBgClass(level)} text-white text-xs font-bold uppercase`}
              >
                {riskLevelLabel(lang, level)} · {liveRisk}/100
              </Badge>
              {trending && (
                <Badge variant="outline" className="text-xs border-red-400 text-red-600">
                  ↑ Rising
                </Badge>
              )}
            </div>

            {/* Sub-info: location + time + probability + confidence */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">{t(lang, 'current_location')}</p>
                  <p className="font-medium truncate">{location.name}, {location.state.split(' ')[0]}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">{t(lang, 'expected_within')}</p>
                  <p className="font-medium">{peak.expectedStart}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">{t(lang, 'main_hazard')} P</p>
                  <p className="font-medium tabular-nums">{peak.probability}%</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">{t(lang, 'confidence')}</p>
                  <p className="font-medium tabular-nums">{peak.confidence}%</p>
                </div>
              </div>
            </div>

            {/* Action banner */}
            <div
              className={`mt-3 rounded-lg p-2.5 flex items-center justify-between gap-2 ${isSevere ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900' : 'bg-muted/50'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="h-5 w-5 shrink-0" style={{ color: bgColor }} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(lang, 'recommended_action')}</p>
                  <p className="text-sm font-bold tracking-tight">{actionKey}</p>
                </div>
              </div>
              <Button
                size="sm"
                className={`shrink-0 ${isSevere ? 'bg-red-600 hover:bg-red-700' : ''}`}
                onClick={() => {
                  // Scroll to the actions section
                  document.getElementById('recommended-actions')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <Bell className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">{t(lang, 'recommended_action')}</span>
                <ChevronRight className="h-3.5 w-3.5 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
