'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { t } from '@/lib/translations'
import { generateDataSourceStatuses, timeAgoLabel } from '@/lib/weather-engine'
import { DataSourceKey, DataStatus } from '@/lib/types'
import {
  Activity, Radar, Satellite, Radio, CloudRain, Gauge, Cpu, Bell, MapPin, Clock,
  Database, Server, RefreshCw,
} from 'lucide-react'

const STATUS_COLOR: Record<DataStatus, string> = {
  LIVE: 'bg-emerald-500',
  RECENT: 'bg-lime-500',
  DELAYED: 'bg-amber-500',
  STALE: 'bg-orange-500',
  OFFLINE: 'bg-red-500',
}

const STATUS_TEXT: Record<DataStatus, string> = {
  LIVE: 'text-emerald-600',
  RECENT: 'text-lime-600',
  DELAYED: 'text-amber-600',
  STALE: 'text-orange-600',
  OFFLINE: 'text-red-600',
}

const SOURCE_ICON: Record<DataSourceKey, typeof Activity> = {
  gps: MapPin,
  time: Clock,
  weather: CloudRain,
  radar: Radar,
  satellite: Satellite,
  aws: Gauge,
  iot: Radio,
  lightning: Activity,
  rain_gauge: CloudRain,
  forecast_model: Database,
  ai_model: Cpu,
  alert_engine: Bell,
}

interface Props {
  socketConnected?: boolean
}

export function SystemStatus({ socketConnected = true }: Props) {
  const { language } = useAppStore()
  const lang = language
  // Defer time-based rendering to client-side only to avoid SSR hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true)
      setNow(Date.now())
    }, 0)
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(t)
      clearInterval(i)
    }
  }, [])

  // Use a placeholder `now` (current real time) for the sources calc when not mounted yet,
  // but render the same value on server & client by gating display on `mounted`.
  const sources = generateDataSourceStatuses(mounted ? now : 0)
  const order: DataSourceKey[] = [
    'gps', 'time', 'weather', 'radar', 'satellite', 'aws', 'iot',
    'lightning', 'rain_gauge', 'forecast_model', 'ai_model', 'alert_engine',
  ]

  // Override WS source state if socket disconnected
  const displaySources = socketConnected
    ? sources
    : {
        ...sources,
        weather: { ...sources.weather, status: 'OFFLINE' as DataStatus },
        radar: { ...sources.radar, status: 'STALE' as DataStatus },
        lightning: { ...sources.lightning, status: 'OFFLINE' as DataStatus },
        ai_model: { ...sources.ai_model, status: 'DELAYED' as DataStatus },
      }

  const liveCount = order.filter(k => displaySources[k].status === 'LIVE').length
  const offlineCount = order.filter(k => displaySources[k].status === 'OFFLINE').length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Server className="h-4 w-4 text-orange-500" />
            {t(lang, 'system_status')}
          </CardTitle>
          <Badge variant={offlineCount > 0 ? 'destructive' : 'default'} className="text-xs">
            {liveCount}/{order.length} LIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {order.map(key => {
          const s = displaySources[key]
          const Icon = SOURCE_ICON[key]
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {s.updateFrequency} · {timeAgoLabel(s.lastUpdated, now)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-2 w-2">
                  {s.status === 'LIVE' && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_COLOR[s.status]}`} />
                </span>
                <span className={`text-[10px] font-semibold uppercase ${STATUS_TEXT[s.status]}`}>
                  {t(lang, s.status.toLowerCase())}
                </span>
              </div>
            </div>
          )
        })}

        {/* WebSocket status footer */}
        <div className="mt-2 flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <RefreshCw className={`h-3 w-3 ${socketConnected ? 'text-emerald-500 animate-spin-slow' : 'text-red-500'}`} />
            <span>WebSocket Stream</span>
          </div>
          <Badge variant={socketConnected ? 'default' : 'destructive'} className="text-[10px]">
            {socketConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
