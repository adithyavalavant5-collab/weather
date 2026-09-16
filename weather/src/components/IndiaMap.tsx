'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { INDIA_STATES, STATE_MAP_POSITIONS } from '@/lib/locations'
import { generateStateRiskSummaries, riskColor, riskLevelFromScore } from '@/lib/weather-engine'
import { t, hazardLabel } from '@/lib/translations'
import type { HazardType, RiskLevel } from '@/lib/types'
import type { ApiResponse, MapWeatherPayload, MapWeatherPoint } from '@/services/weather/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Layers, Map as MapIcon, ZoomIn, ZoomOut, Radar, CloudRain, Zap, Waves,
  RefreshCw, Loader2, WifiOff,
} from 'lucide-react'

type MapLayer = 'risk' | 'rainfall' | 'lightning' | 'flood'

const LAYER_INFO: Record<MapLayer, { label: string; icon: typeof Radar; color: string }> = {
  risk: { label: 'Risk Heatmap', icon: Radar, color: '#ef4444' },
  rainfall: { label: 'Rainfall', icon: CloudRain, color: '#3b82f6' },
  lightning: { label: 'Lightning', icon: Zap, color: '#a855f7' },
  flood: { label: 'Flood Risk', icon: Waves, color: '#0891b2' },
}

interface Props {
  onPickState?: (stateCode: string) => void
}

interface LiveStateStats {
  state: string
  stateCode: string
  overallRisk: number
  riskLevel: RiskLevel
  topHazard: HazardType
  pointCount: number
  highRiskPoints: number
  avgTemperature: number
  maxRain: number
  maxWind: number
  lightningScore: number
  observedAt: number
}

function topHazardFor(points: MapWeatherPoint[]): HazardType {
  let maxRain = 0
  let maxWind = 0
  let thunder = 0
  for (const p of points) {
    maxRain = Math.max(maxRain, p.precipitation)
    maxWind = Math.max(maxWind, p.windSpeed, p.windGusts ?? 0)
    if (p.weatherCode === 99 || p.weatherCode === 96) thunder = Math.max(thunder, 2)
    else if (p.weatherCode === 95) thunder = Math.max(thunder, 1)
  }
  if (thunder >= 2) return 'lightning'
  if (thunder === 1) return 'thunderstorm'
  if (maxRain >= 12) return 'extreme_rain'
  if (maxRain >= 2.5) return 'heavy_rain'
  if (maxWind >= 62) return 'high_wind'
  return 'normal'
}

function rainColor(mm: number): string {
  if (mm < 0.1) return '#334155'
  if (mm < 2.5) return '#93c5fd'
  if (mm < 7.5) return '#3b82f6'
  if (mm < 12) return '#1d4ed8'
  if (mm < 21) return '#6d28d9'
  return '#a21caf'
}

function floodColor(mm: number): string {
  if (mm < 0.1) return '#164e63'
  if (mm < 2.5) return '#0e7490'
  if (mm < 7.5) return '#06b6d4'
  if (mm < 12) return '#eab308'
  if (mm < 21) return '#f97316'
  return '#dc2626'
}

function lightningColor(score: number): string {
  if (score >= 2) return '#d946ef'
  if (score >= 1) return '#a855f7'
  return '#312e81'
}

function Legend({ layer }: { layer: MapLayer }) {
  const items = layer === 'risk'
    ? [
        { label: 'Low (0–20)', color: riskColor('low') },
        { label: 'Moderate (21–40)', color: riskColor('moderate') },
        { label: 'Elevated (41–60)', color: riskColor('elevated') },
        { label: 'High (61–80)', color: riskColor('high') },
        { label: 'Very High (81–90)', color: riskColor('very_high') },
        { label: 'Extreme (91+)', color: riskColor('extreme') },
      ]
    : layer === 'rainfall'
      ? [
          { label: 'Dry (<0.1 mm)', color: '#334155' },
          { label: 'Light (0.1–2.5)', color: '#93c5fd' },
          { label: 'Moderate (2.5–7.5)', color: '#3b82f6' },
          { label: 'Heavy (7.5–12)', color: '#1d4ed8' },
          { label: 'Very heavy (12–21)', color: '#6d28d9' },
          { label: 'Extreme (21+)', color: '#a21caf' },
        ]
      : layer === 'lightning'
        ? [
            { label: 'No thunder signal', color: '#312e81' },
            { label: 'Thunderstorm', color: '#a855f7' },
            { label: 'Severe thunder/lightning', color: '#d946ef' },
          ]
        : [
            { label: 'Dry / very low', color: '#164e63' },
            { label: 'Low', color: '#0e7490' },
            { label: 'Moderate', color: '#06b6d4' },
            { label: 'Elevated', color: '#eab308' },
            { label: 'High', color: '#f97316' },
            { label: 'Very high', color: '#dc2626' },
          ]

  return (
    <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur rounded p-2 text-xs text-white shadow-lg">
      <p className="font-semibold mb-1 opacity-80">{LAYER_INFO[layer].label} Legend</p>
      <div className="flex flex-col gap-1">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-white/20" style={{ background: item.color }} />
            <span className="opacity-90">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function IndiaMap({ onPickState }: Props) {
  const { location, language, now } = useAppStore()
  const health = useRealWeatherStore(s => s.health)
  const [layer, setLayer] = useState<MapLayer>('risk')
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [liveMapData, setLiveMapData] = useState<MapWeatherPayload | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const lang = language

  const loadLiveStateData = useCallback(async (force = false) => {
    setLiveLoading(true)
    try {
      const suffix = force ? `?_t=${Date.now()}` : ''
      const res = await fetch(`/api/weather/map-data${suffix}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Live risk map HTTP ${res.status}`)
      const json = await res.json() as ApiResponse<MapWeatherPayload>
      if (!json.ok || !json.data) throw new Error(json.error || 'Live state weather unavailable')
      setLiveMapData(json.data)
      setLiveError(json.error ?? null)
    } catch (err) {
      // Preserve the last successful live snapshot. We never replace real risk
      // colours with newly generated fake colours after a temporary outage.
      setLiveError(err instanceof Error ? err.message : 'Live state weather unavailable')
    } finally {
      setLiveLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLiveStateData(true)
    const timer = window.setInterval(() => { void loadLiveStateData(true) }, 60_000)
    return () => window.clearInterval(timer)
  }, [loadLiveStateData])

  const liveSummaries = useMemo(() => {
    if (!liveMapData?.points.length) return new Map<string, LiveStateStats>()

    const byState = new Map<string, MapWeatherPoint[]>()
    for (const point of liveMapData.points) {
      const key = point.state.trim().toLowerCase()
      const bucket = byState.get(key)
      if (bucket) bucket.push(point)
      else byState.set(key, [point])
    }

    const out = new Map<string, LiveStateStats>()
    for (const state of INDIA_STATES) {
      const points = byState.get(state.name.trim().toLowerCase()) ?? []
      if (points.length === 0) continue
      const overallRisk = Math.max(...points.map(p => p.riskScore))
      const maxRain = Math.max(...points.map(p => p.precipitation))
      const maxWind = Math.max(...points.map(p => Math.max(p.windSpeed, p.windGusts ?? 0)))
      const avgTemperature = points.reduce((sum, p) => sum + p.temperature, 0) / points.length
      const lightningScore = points.reduce((best, p) => {
        if (p.weatherCode === 99 || p.weatherCode === 96) return Math.max(best, 2)
        if (p.weatherCode === 95) return Math.max(best, 1)
        return best
      }, 0)
      out.set(state.code, {
        state: state.name,
        stateCode: state.code,
        overallRisk,
        riskLevel: riskLevelFromScore(overallRisk),
        topHazard: topHazardFor(points),
        pointCount: points.length,
        highRiskPoints: points.filter(p => p.riskScore > 60).length,
        avgTemperature: Math.round(avgTemperature * 10) / 10,
        maxRain: Math.round(maxRain * 10) / 10,
        maxWind: Math.round(maxWind),
        lightningScore,
        observedAt: Math.max(...points.map(p => p.observedAt)),
      })
    }
    return out
  }, [liveMapData])

  // Keep the legacy simulated state summaries ONLY when the user explicitly
  // switches the weather source to Simulator. In Real API mode, missing live
  // state data is shown neutral/grey rather than pretending fake data is live.
  const simulatorSummaries = useMemo(() => generateStateRiskSummaries(now), [now])
  const simulatorMode = health?.dataSource === 'simulator'
  const useLive = !simulatorMode && liveSummaries.size > 0

  const selectedStateCode = useMemo(() => {
    if (!location) return null
    const match = INDIA_STATES.find(s => s.name === location.state)
    return match?.code ?? null
  }, [location])

  const colorFor = (stateCode: string): string => {
    if (useLive) {
      const s = liveSummaries.get(stateCode)
      if (!s) return '#374151'
      if (layer === 'risk') return riskColor(s.riskLevel)
      if (layer === 'rainfall') return rainColor(s.maxRain)
      if (layer === 'lightning') return lightningColor(s.lightningScore)
      return floodColor(s.maxRain)
    }

    if (simulatorMode) {
      const summary = simulatorSummaries.find(s => s.stateCode === stateCode)
      if (!summary) return '#1f2937'
      if (layer === 'risk') return riskColor(summary.overallRisk >= 90 ? 'extreme' : summary.riskLevel)
      if (layer === 'rainfall') return `hsl(210, 80%, ${30 + (100 - summary.overallRisk) * 0.4}%)`
      if (layer === 'lightning') return summary.topHazard === 'lightning' ? '#a855f7' : '#312e81'
      if (layer === 'flood') {
        const isFlood = summary.topHazard === 'flash_flood' || summary.topHazard === 'flood'
        return isFlood ? riskColor(summary.riskLevel) : '#164e63'
      }
    }

    return '#374151'
  }

  const hoveredLive = hoveredState ? liveSummaries.get(hoveredState) ?? null : null
  const hoveredSimulator = hoveredState ? simulatorSummaries.find(s => s.stateCode === hoveredState) ?? null : null

  const sourceLabel = useLive
    ? `LIVE · Open-Meteo · ${liveMapData?.points.length ?? 0} points`
    : simulatorMode
      ? 'SIMULATOR'
      : liveLoading
        ? 'SYNCING LIVE DATA…'
        : 'LIVE DATA UNAVAILABLE'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapIcon className="h-5 w-5 text-orange-500" />
            {t(lang, 'india_risk_map')}
            <Badge variant={useLive ? 'secondary' : 'outline'} className="text-[10px]">
              {sourceLabel}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { void loadLiveStateData(true) }}
              disabled={liveLoading || simulatorMode}
              title="Refresh live India risk map"
            >
              {liveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.8, z - 0.2))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1 tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap pt-1">
          <Layers className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {(Object.keys(LAYER_INFO) as MapLayer[]).map(k => {
            const info = LAYER_INFO[k]
            const Icon = info.icon
            const isActive = layer === k
            return (
              <Button
                key={k}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className={`h-7 px-2 text-xs ${isActive ? 'bg-foreground text-background' : ''}`}
                onClick={() => setLayer(k)}
              >
                <Icon className="h-3 w-3 mr-1" style={{ color: isActive ? 'currentColor' : info.color }} />
                {info.label}
              </Button>
            )
          })}
        </div>

        {!simulatorMode && liveError && (
          <div className="flex items-start gap-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <WifiOff className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{liveMapData ? `Live refresh issue — keeping last good colours. ${liveError}` : `Live map data unavailable: ${liveError}`}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-2">
        <div className="relative aspect-[5/6] bg-slate-950 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />

          <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="500" height="500" fill="url(#grid)" />

            <path
              d="M 240 80 L 260 70 L 280 75 L 300 70 L 320 80 L 340 90 L 360 85 L 380 100 L 390 120 L 410 130 L 430 140 L 440 160 L 450 180 L 460 200 L 470 220 L 475 240 L 470 260 L 460 280 L 445 300 L 430 320 L 410 340 L 390 360 L 370 380 L 350 395 L 330 405 L 310 410 L 290 405 L 270 395 L 250 380 L 230 360 L 215 340 L 200 320 L 190 300 L 185 280 L 180 260 L 175 240 L 170 220 L 165 200 L 165 180 L 175 160 L 190 140 L 210 120 L 225 100 Z"
              fill="rgba(15, 23, 42, 0.6)"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1.5"
            />

            {Object.entries(STATE_MAP_POSITIONS).map(([code, pos]) => {
              const live = liveSummaries.get(code)
              const sim = simulatorSummaries.find(s => s.stateCode === code)
              const riskValue = useLive ? live?.overallRisk : simulatorMode ? sim?.overallRisk : undefined
              const isHovered = hoveredState === code
              const isSelected = selectedStateCode === code
              const fill = colorFor(code)
              return (
                <g
                  key={code}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredState(code)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => onPickState?.(code)}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.w}
                    height={pos.h}
                    rx="3"
                    fill={fill}
                    fillOpacity={isHovered || isSelected ? 1 : 0.82}
                    stroke={isSelected ? '#fb923c' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.32)'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                    filter={isHovered ? 'url(#glow)' : undefined}
                  />
                  <text
                    x={pos.x + pos.w / 2}
                    y={pos.y + pos.h / 2 - 4}
                    textAnchor="middle"
                    fontSize={code === 'DL' || code === 'CH' || code === 'PY' ? 7 : 9}
                    fontWeight="700"
                    fill="white"
                    style={{ pointerEvents: 'none' }}
                  >
                    {code}
                  </text>
                  <text
                    x={pos.x + pos.w / 2}
                    y={pos.y + pos.h / 2 + 7}
                    textAnchor="middle"
                    fontSize={7}
                    fontWeight="600"
                    fill="rgba(255,255,255,0.92)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {riskValue ?? '—'}
                  </text>
                </g>
              )
            })}

            {location && (() => {
              const match = INDIA_STATES.find(s => s.name === location.state)
              const code = match?.code
              const pos = code ? STATE_MAP_POSITIONS[code] : null
              if (!pos) return null
              return (
                <g>
                  <circle
                    cx={pos.x + pos.w / 2}
                    cy={pos.y + pos.h / 2}
                    r="6"
                    fill="#fb923c"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              )
            })()}
          </svg>

          {useLive && hoveredLive && (
            <div className="absolute top-2 right-2 bg-black/85 backdrop-blur rounded-lg p-3 border border-white/10 max-w-xs text-xs text-white shadow-xl">
              <p className="font-bold text-sm">{hoveredLive.state}</p>
              <p className="opacity-65 text-[10px]">LIVE weather-derived risk · {hoveredLive.pointCount} points</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="opacity-70">Current Risk</span>
                  <span className="font-bold" style={{ color: riskColor(hoveredLive.riskLevel) }}>
                    {hoveredLive.overallRisk}/100 · {hoveredLive.riskLevel.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between gap-3"><span className="opacity-70">Top Hazard</span><span>{hazardLabel(lang, hoveredLive.topHazard)}</span></div>
                <div className="flex justify-between gap-3"><span className="opacity-70">Avg Temp</span><span>{hoveredLive.avgTemperature}°C</span></div>
                <div className="flex justify-between gap-3"><span className="opacity-70">Max Current Rain</span><span>{hoveredLive.maxRain} mm</span></div>
                <div className="flex justify-between gap-3"><span className="opacity-70">Max Wind/Gust</span><span>{hoveredLive.maxWind} km/h</span></div>
                <div className="flex justify-between gap-3"><span className="opacity-70">High+ points</span><span>{hoveredLive.highRiskPoints}</span></div>
                <div className="border-t border-white/10 pt-1 text-[9px] opacity-60">
                  Provider time {new Date(hoveredLive.observedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}

          {!useLive && simulatorMode && hoveredSimulator && (
            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur rounded-lg p-3 border border-white/10 max-w-xs text-xs text-white">
              <p className="font-bold text-sm">{hoveredSimulator.state}</p>
              <p className="opacity-60 text-[10px]">SIMULATOR</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between gap-3"><span className="opacity-70">Overall Risk</span><span className="font-bold" style={{ color: riskColor(hoveredSimulator.riskLevel) }}>{hoveredSimulator.overallRisk}/100</span></div>
                <div className="flex justify-between gap-3"><span className="opacity-70">Top Hazard</span><span>{hazardLabel(lang, hoveredSimulator.topHazard)}</span></div>
              </div>
            </div>
          )}

          {!useLive && !simulatorMode && !liveLoading && (
            <div className="absolute inset-x-16 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-black/65 p-3 text-center text-xs text-white backdrop-blur">
              Live state colours are unavailable right now. The map stays neutral instead of displaying simulated values as real weather.
            </div>
          )}

          <Legend layer={layer} />

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge variant="outline" className="bg-black/70 text-white border-white/20 backdrop-blur w-fit">
              {LAYER_INFO[layer].label}
            </Badge>
            {useLive && liveMapData && (
              <Badge variant="outline" className="bg-emerald-950/80 text-emerald-200 border-emerald-700/60 backdrop-blur w-fit text-[9px]">
                Live sync {new Date(liveMapData.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
