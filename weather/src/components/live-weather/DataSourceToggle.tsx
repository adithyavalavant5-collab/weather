'use client'

// ============================================================================
// DataSourceToggle — UI control to switch the live-weather module between
// "real" (external API) and "simulator" (existing in-app weather-engine).
// Calls POST /api/weather/source with the chosen source. The server caches
// the override in-memory for the lifetime of the dev server process.
//
// NOTE: The real-weather store now feeds the selected-location weather,
// timeline, warning/risk and action widgets whenever live provider data is
// available. The separate WebSocket simulator still exists for demo-only
// ingestion/alert-delivery behaviour.
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Database, Activity, RefreshCw, Loader2, Info, CheckCircle2,
} from 'lucide-react'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { useRealWeather } from '@/hooks/useRealWeather'

type EffectiveSource = 'real' | 'simulator'

export function DataSourceToggle() {
  const [env, setEnv] = useState<string>('simulator')
  const [override, setOverride] = useState<EffectiveSource | null>(null)
  const [effective, setEffective] = useState<EffectiveSource>('simulator')
  const [busy, setBusy] = useState(false)
  const [lastSwitched, setLastSwitched] = useState<number | null>(null)
  const { health } = useRealWeatherStore()
  const { fetchHealth, fetchForecast } = useRealWeather({ enabled: false })

  // Fetch current source state on mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/weather/source', { cache: 'no-store' })
        const json = await res.json() as {
          ok: boolean
          data?: { env: string; override: EffectiveSource | null; effective: EffectiveSource }
        }
        if (!cancelled && json.ok && json.data) {
          setEnv(json.data.env)
          setOverride(json.data.override)
          setEffective(json.data.effective)
        }
      } catch {
        /* best-effort */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const setSource = async (s: EffectiveSource) => {
    setBusy(true)
    try {
      await fetch('/api/weather/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: s }),
      })
      const res = await fetch('/api/weather/source', { cache: 'no-store' })
      const json = await res.json() as {
        ok: boolean
        data?: { env: string; override: EffectiveSource | null; effective: EffectiveSource }
      }
      if (json.ok && json.data) {
        setOverride(json.data.override)
        setEffective(json.data.effective)
      }
      setLastSwitched(Date.now())
      // Refresh health snapshot so provider status reflects new source
      await fetchHealth()
      await fetchForecast(true)
    } finally {
      setBusy(false)
    }
  }

  const resetOverride = async () => {
    setBusy(true)
    try {
      await fetch('/api/weather/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: null }),
      })
      const res = await fetch('/api/weather/source', { cache: 'no-store' })
      const json = await res.json() as {
        ok: boolean
        data?: { env: string; override: EffectiveSource | null; effective: EffectiveSource }
      }
      if (json.ok && json.data) {
        setOverride(json.data.override)
        setEffective(json.data.effective)
      }
      setLastSwitched(Date.now())
      await fetchHealth()
      await fetchForecast(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-500" />
          Live Weather Data Source
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 text-xs">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={effective === 'real' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            disabled={busy || effective === 'real'}
            onClick={() => setSource('real')}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Activity className="h-3.5 w-3.5 mr-1" />}
            Real API
          </Button>
          <Button
            variant={effective === 'simulator' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            disabled={busy || effective === 'simulator'}
            onClick={() => setSource('simulator')}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Database className="h-3.5 w-3.5 mr-1" />}
            Simulator
          </Button>
        </div>

        <div className="space-y-1 text-[11px]">
          <Row label="Env default" value={env} />
          <Row
            label="Runtime override"
            value={override ?? '— (using env)'}
          />
          <Row
            label="Effective now"
            value={
              <Badge variant={effective === 'real' ? 'secondary' : 'outline'} className="text-[10px]">
                {effective === 'real' ? 'Real API' : 'Simulator'}
              </Badge>
            }
            highlight
          />
          {health?.providerName && (
            <Row label="Provider" value={health.providerName} />
          )}
          {health && (
            <Row
              label="Provider configured"
              value={
                health.providerConfigured ? (
                  <span className="text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Yes
                  </span>
                ) : (
                  <span className="text-amber-600">No — using Open-Meteo fallback</span>
                )
              }
            />
          )}
          {health && (
            <Row
              label="Cache TTL"
              value={`${Math.round((health.cacheTtlMs / 1000) / 60)} min`}
            />
          )}
          {health && (
            <Row
              label="Refresh interval"
              value={`${Math.round((health.refreshIntervalMs / 1000) / 60)} min`}
            />
          )}
          {health?.lastSuccessfulFetch && (
            <Row
              label="Last successful fetch"
              value={new Date(health.lastSuccessfulFetch).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
            />
          )}
          {health?.lastError && (
            <Row label="Last error" value={<span className="text-red-600">{health.lastError}</span>} />
          )}
        </div>

        <div className="flex items-center gap-1 pt-1">
          {override !== null && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetOverride} disabled={busy}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset to env default
            </Button>
          )}
          {lastSwitched && (
            <span className="text-[10px] text-muted-foreground">
              Switched {new Date(lastSwitched).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground italic flex items-start gap-1 pt-1 border-t">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Real API mode drives the selected-location weather, forecast, risk/warning
            widgets and the coloured India map when live provider data is available.
            The WebSocket simulator remains available for demo-only ingestion and delivery.
            The source override resets when the server restarts.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function Row({
  label, value, highlight,
}: {
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? 'text-emerald-600' : ''}`}>{value}</span>
    </div>
  )
}
