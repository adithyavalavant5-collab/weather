'use client'

// ============================================================================
// WeatherLayerControl — switches the map between Temperature / Rainfall /
// Wind / Alerts overlays. Pure presentational component.
// ============================================================================

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Thermometer, CloudRain, Wind, AlertTriangle, Layers,
} from 'lucide-react'
import type { WeatherLayer } from '@/services/weather/types'

const LAYERS: { key: WeatherLayer; label: string; icon: typeof Thermometer; color: string }[] = [
  { key: 'temperature', label: 'Temperature', icon: Thermometer, color: '#f97316' },
  { key: 'precipitation', label: 'Rainfall', icon: CloudRain, color: '#3b82f6' },
  { key: 'wind', label: 'Wind', icon: Wind, color: '#22c55e' },
  { key: 'alerts', label: 'Risk / Alerts', icon: AlertTriangle, color: '#dc2626' },
]

interface Props {
  value: WeatherLayer
  onChange: (l: WeatherLayer) => void
}

export function WeatherLayerControl({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Layers className="h-3.5 w-3.5 text-muted-foreground mr-1" />
      {LAYERS.map(l => {
        const Icon = l.icon
        const isActive = value === l.key
        return (
          <Button
            key={l.key}
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            className={`h-7 px-2 text-xs ${isActive ? 'bg-foreground text-background' : ''}`}
            onClick={() => onChange(l.key)}
            title={`Show ${l.label} layer`}
          >
            <Icon className="h-3 w-3 mr-1" style={{ color: isActive ? 'currentColor' : l.color }} />
            {l.label}
          </Button>
        )
      })}
    </div>
  )
}
