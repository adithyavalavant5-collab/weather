'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { LANGUAGES, t } from '@/lib/translations'
import { formatClock, formatDate, timeAgoLabel } from '@/lib/weather-engine'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  MapPin, Clock, Globe, Activity, Wifi, WifiOff, Pause, Play, RotateCcw,
  LayoutDashboard, Shield, ChevronDown,
} from 'lucide-react'

interface Props {
  onOpenLocation: () => void
}

export function Header({ onOpenLocation }: Props) {
  const {
    location, language, setLanguage, viewMode, setViewMode,
    now, tickNow, setNow, gpsPermission, paused, setPaused, lastWsUpdate,
  } = useAppStore()
  // Defer rendering of any time-based value until after mount to avoid SSR
  // hydration mismatch (server has no concept of "current local time").
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Defer setState to avoid cascading renders warning
    const t = setTimeout(() => {
      setMounted(true)
      setNow(Date.now())
    }, 0)
    const interval = setInterval(() => {
      tickNow()
    }, 1000)
    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [tickNow, setNow])

  // Use a Date constructed from `now` (0 → epoch → render "—" before mount)
  const nowDate = mounted && now > 0 ? new Date(now) : null

  const lang = language
  const weatherHealth = useRealWeatherStore(s => s.health)
  const realForecast = useRealWeatherStore(s => s.forecast)
  const isLive = weatherHealth?.dataSource === 'real' || realForecast?.dataSource === 'real'
  const isPaused = paused
  const lastUpdateLabel = mounted && lastWsUpdate ? timeAgoLabel(lastWsUpdate, now) : '—'

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="px-3 md:px-5 py-2.5">
        {/* Top row: brand + view mode toggle + language */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-bold leading-tight truncate">
                {t(lang, 'app_title')}
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-tight hidden sm:block truncate">
                {t(lang, 'app_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View mode toggle */}
            <div className="inline-flex items-center rounded-md border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setViewMode('citizen')}
                className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-sm transition-colors ${viewMode === 'citizen' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                <LayoutDashboard className="h-3 w-3" />
                <span className="hidden md:inline">{t(lang, 'citizen_dashboard')}</span>
              </button>
              <button
                onClick={() => setViewMode('admin')}
                className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-sm transition-colors ${viewMode === 'admin' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                <Shield className="h-3 w-3" />
                <span className="hidden md:inline">{t(lang, 'admin_dashboard')}</span>
              </button>
            </div>

            {/* Language */}
            <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <Globe className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="font-medium">{l.nativeLabel}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{l.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second row: location, time, data mode, status */}
        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
          {/* Location pill */}
          <button
            onClick={onOpenLocation}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card pl-2 pr-3 py-1 hover:bg-accent transition-colors"
            title={t(lang, 'select_location')}
          >
            <MapPin className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-medium">
              {location ? location.name : t(lang, 'select_location')}
            </span>
            {location && (
              <span className="text-muted-foreground hidden sm:inline">
                · {location.district}, {location.state.split(' ')[0]}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {/* Time pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-mono font-medium tabular-nums">
              {nowDate ? formatClock(nowDate, true) : '—:—:— —'}
            </span>
            {nowDate && (
              <span className="text-muted-foreground hidden md:inline">
                · {formatDate(nowDate).split(',').slice(0, 2).join(',')}
              </span>
            )}
          </div>

          {/* GPS status */}
          <div className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${gpsPermission === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${gpsPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="font-medium">{t(lang, 'gps')}</span>
            <span className="text-muted-foreground hidden sm:inline">
              {gpsPermission === 'granted' ? 'ON' : 'manual'}
            </span>
          </div>

          {/* Data mode */}
          <Badge
            variant="outline"
            className={`${isLive ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-amber-500 text-amber-700 bg-amber-50'} text-xs font-semibold`}
          >
            {isLive ? (
              <><Wifi className="h-3 w-3 mr-1" />LIVE WEATHER</>
            ) : (
              <><Activity className="h-3 w-3 mr-1" />DEMO WEATHER</>
            )}
          </Badge>

          {/* Last WS update */}
          <Badge variant="secondary" className="text-xs">
            <span className="opacity-70">WS:</span> {lastUpdateLabel}
          </Badge>

          {/* Pause/Resume + Reset */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPaused(!isPaused)}
              title={isPaused ? 'Resume live updates' : 'Pause live updates'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span className="hidden md:inline ml-1">{isPaused ? t(lang, 'resume') : t(lang, 'pause')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => window.location.reload()}
              title="Reset demo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline ml-1">{t(lang, 'reset_demo')}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
