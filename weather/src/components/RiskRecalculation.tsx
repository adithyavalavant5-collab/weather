'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/translations'
import {
  Radio, Filter, Cpu, Zap, Activity, RefreshCw, Clock, Bell, ArrowDown,
} from 'lucide-react'

const STEPS = [
  { key: 'new_data', label: 'New Data', icon: Radio, color: 'text-blue-500' },
  { key: 'validation', label: 'Validation', icon: Filter, color: 'text-cyan-500' },
  { key: 'fusion', label: 'Data Fusion', icon: Filter, color: 'text-teal-500' },
  { key: 'ai_prediction', label: 'AI Prediction', icon: Cpu, color: 'text-purple-500' },
  { key: 'hazard_detection', label: 'Hazard Detection', icon: Zap, color: 'text-amber-500' },
  { key: 'risk_recalc', label: 'Risk Recalculation', icon: Activity, color: 'text-orange-500' },
  { key: 'timeline_update', label: '6-Hour Timeline Update', icon: Clock, color: 'text-rose-500' },
  { key: 'alert_decision', label: 'Alert Decision', icon: Bell, color: 'text-red-500' },
  { key: 'alert_delivery', label: 'Alert Delivery', icon: RefreshCw, color: 'text-emerald-500' },
]

interface Props {
  latestRisk?: number
  prevRisk?: number
  triggered?: boolean
}

export function RiskRecalculation({ latestRisk, prevRisk, triggered }: Props) {
  const { language } = useAppStore()
  const lang = language
  const [activeStep, setActiveStep] = useState(0)

  // Animate steps when a new update arrives
  useEffect(() => {
    if (latestRisk === undefined) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setActiveStep(i)
      if (i >= STEPS.length) clearInterval(interval)
    }, 200)
    return () => clearInterval(interval)
  }, [latestRisk])

  const delta = latestRisk !== undefined && prevRisk !== undefined ? latestRisk - prevRisk : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4 text-orange-500" />
            {t(lang, 'risk_recalculation')}
          </CardTitle>
          {triggered && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              HIGH-PRIORITY WARNING TRIGGERED
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Risk evolution chart */}
        <div className="rounded-md bg-muted/30 p-3 mb-3">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-muted-foreground">Risk Evolution</span>
            <div className="flex items-center gap-3">
              <span className="font-mono">
                <span className="text-muted-foreground">prev:</span>{' '}
                <span className="font-bold">{prevRisk ?? '—'}</span>
              </span>
              <ArrowDown className="h-3 w-3 rotate-[-90deg]" />
              <span className="font-mono">
                <span className="text-muted-foreground">now:</span>{' '}
                <span className={`font-bold ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : ''}`}>
                  {latestRisk ?? '—'}
                </span>
                {delta !== 0 && (
                  <span className={`ml-1 ${delta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ({delta > 0 ? '+' : ''}{delta})
                  </span>
                )}
              </span>
            </div>
          </div>
          {/* Mini sparkline showing ramp up */}
          <div className="flex items-end gap-1 h-12">
            {[20, 30, 28, 42, 55, 67, 78, 89].map((v, i) => {
              const isLast = i === 7
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${isLast ? 'bg-red-500' : 'bg-orange-300'}`}
                  style={{ height: `${v}%` }}
                  title={`t-${7 - i} min: ${v}`}
                />
              )
            })}
          </div>
        </div>

        {/* Pipeline steps */}
        <div className="grid grid-cols-3 md:grid-cols-9 gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = i === activeStep
            const isDone = i < activeStep
            return (
              <div
                key={step.key}
                className={`flex flex-col items-center text-center p-1.5 rounded-md border transition-all ${
                  isActive
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 scale-105'
                    : isDone
                      ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'border-border bg-card opacity-50'
                }`}
              >
                <Icon className={`h-4 w-4 mb-1 ${isActive ? 'text-orange-500' : isDone ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <span className={`text-[9px] font-medium leading-tight ${isActive ? 'text-orange-700 dark:text-orange-300' : isDone ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Example scenario log */}
        <div className="mt-3 rounded-md bg-slate-950 dark:bg-black/40 p-2 font-mono text-[10px] text-emerald-400 overflow-x-auto">
          <p>$ tail -f /var/log/risk-engine.log</p>
          <p className="opacity-70">[14:00] lightning_risk = 42 · confidence 71%</p>
          <p className="opacity-70">[14:10] new radar scan + AWS obs received</p>
          <p className="opacity-70">[14:10] ai prediction cycle started...</p>
          <p className="opacity-70">[14:11] ai prediction complete</p>
          <p className="opacity-70">[14:11] lightning_risk = 67 · confidence 78% ↑</p>
          <p className="opacity-70">[14:20] new lightning strike detected</p>
          <p className="opacity-70">[14:20] ai prediction cycle started...</p>
          <p className="opacity-70">[14:21] lightning_risk = 89 · confidence 84% ↑↑</p>
          <p className="text-red-400 animate-pulse">{'[14:21] >>> HIGH-PRIORITY WARNING TRIGGERED'}</p>
          <p className="text-red-400 animate-pulse">{'[14:21] >>> DISPATCH: SMS · IVR · SIREN · PUSH · AUTH'}</p>
        </div>
      </CardContent>
    </Card>
  )
}
