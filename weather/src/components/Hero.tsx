'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/translations'
import {
  Activity, MapPin, Clock, CloudRain, AlertTriangle, Bell, Globe,
  ArrowRight, Target, Shield, Zap, Brain, Map as MapIcon, Radio,
} from 'lucide-react'

interface Props {
  onOpenLocation: () => void
}

export function Hero({ onOpenLocation }: Props) {
  const { language } = useAppStore()
  const lang = language

  return (
    <Card className="overflow-hidden border-2 border-orange-500/20 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-rose-950/20">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950/30">
            SIH Prototype · India
          </Badge>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
          {t(lang, 'app_title')}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mb-3">
          {t(lang, 'app_subtitle')}
        </p>

        {/* Tagline */}
        <div className="rounded-lg bg-foreground/5 dark:bg-background/40 backdrop-blur px-3 py-2 mb-4 border-l-4 border-orange-500">
          <p className="text-sm font-semibold italic text-orange-700 dark:text-orange-400">
            &ldquo;{t(lang, 'tagline')}&rdquo;
          </p>
        </div>

        {/* Core principle */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {[
            { icon: MapPin, label: 'WHERE', sub: 'Hyper-local 1km grid' },
            { icon: Clock, label: 'WHEN', sub: 'Rolling 0-6 hour window' },
            { icon: CloudRain, label: 'WHAT', sub: 'Hazard-specific' },
            { icon: AlertTriangle, label: 'HOW SEVERE', sub: 'Risk score 0-100' },
            { icon: Target, label: 'WHAT TO DO', sub: 'Actionable guidance' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="rounded-md border bg-card/80 backdrop-blur p-2 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
              <p className="text-[9px] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* Differentiator */}
        <p className="text-xs text-muted-foreground mb-4">
          {t(lang, 'differentiator')}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenLocation} className="bg-orange-600 hover:bg-orange-700">
            <MapPin className="h-4 w-4 mr-1" />
            {t(lang, 'select_location')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>11 languages · All 28 states + 8 UTs</span>
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {[
            { icon: Brain, label: 'AI Nowcasting' },
            { icon: MapIcon, label: 'Interactive India Map' },
            { icon: Zap, label: 'Lightning Detection' },
            { icon: Shield, label: 'Multi-Audience Alerts' },
            { icon: Bell, label: 'SMS · IVR · Siren' },
            { icon: Radio, label: 'WebSocket Live Updates' },
            { icon: Clock, label: 'Rolling 6-Hour Timeline' },
          ].map(({ icon: Icon, label }) => (
            <Badge key={label} variant="secondary" className="text-[10px] gap-1 py-0.5">
              <Icon className="h-2.5 w-2.5" />
              {label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
