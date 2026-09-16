'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/translations'
import {
  Database, Radio, Cpu, Activity, Map, Clock, Bell, Users, RefreshCw,
  CloudRain, Filter, Zap, Server, Cloud,
} from 'lucide-react'

const PIPELINE = [
  { key: 'sources', label: 'Data Sources', icon: CloudRain, sub: 'Radar, Satellite, AWS, IoT, Lightning, Rain Gauge, Terrain', color: 'text-blue-500' },
  { key: 'ingestion', label: 'Real-Time Ingestion', icon: Radio, sub: 'Kafka · MQTT · WebSocket · SSE', color: 'text-cyan-500' },
  { key: 'fusion', label: 'Data Fusion & Cleaning', icon: Filter, sub: 'Validation · Normalization · Spatial Alignment', color: 'text-teal-500' },
  { key: 'ai', label: 'AI/ML Nowcasting', icon: Cpu, sub: 'ConvLSTM · U-Net · 3D U-Net · Ensemble', color: 'text-purple-500' },
  { key: 'hazard', label: 'Hazard Detection', icon: Zap, sub: 'Rain · Flood · Lightning · Hail · Cyclone', color: 'text-amber-500' },
  { key: 'risk', label: 'Hyper-Local Risk Engine', icon: Activity, sub: 'Probability × Severity × Exposure × Vulnerability', color: 'text-orange-500' },
  { key: 'gis', label: 'GIS / Map Layer', icon: Map, sub: '1 km grid · India state/district boundaries', color: 'text-emerald-500' },
  { key: 'forecast', label: 'Rolling 6-Hour Forecast', icon: Clock, sub: 'NOW → +1H → +2H → +3H → +4H → +5H → +6H', color: 'text-rose-500' },
  { key: 'alert', label: 'Alert Decision Engine', icon: Bell, sub: 'Threshold checks · Confidence gating · Multi-source confirmation', color: 'text-red-500' },
  { key: 'delivery', label: 'Multi-Channel Delivery', icon: Server, sub: 'SMS · IVR · Siren · Push · Authority Dashboard', color: 'text-pink-500' },
  { key: 'users', label: 'Citizens + Authorities', icon: Users, sub: 'Citizens · Farmers · Disaster Mgmt · Emergency Responders', color: 'text-indigo-500' },
  { key: 'feedback', label: 'Feedback & Retraining', icon: RefreshCw, sub: 'Prediction vs Actual · Error Analysis · Model Updates', color: 'text-emerald-600' },
]

export function ArchitectureDiagram() {
  const { language } = useAppStore()
  const lang = language
  const [activeStep, setActiveStep] = useState(0)

  // Auto-cycle through the pipeline to show data flow
  useEffect(() => {
    const i = setInterval(() => {
      setActiveStep(s => (s + 1) % PIPELINE.length)
    }, 1800)
    return () => clearInterval(i)
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Server className="h-4 w-4 text-orange-500" />
            {t(lang, 'system_architecture')} — End-to-End Pipeline
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live data flow simulation
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Vertical pipeline */}
        <div className="relative">
          <div className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-blue-500 via-orange-500 to-emerald-500 opacity-30" />
          <ol className="space-y-1.5">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon
              const isActive = i === activeStep
              const isPast = i < activeStep
              return (
                <li
                  key={step.key}
                  className={`flex items-start gap-2.5 transition-all ${isActive ? 'scale-[1.02]' : ''}`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                      isActive
                        ? 'bg-orange-500 border-orange-500 shadow-md shadow-orange-500/40 scale-110'
                        : isPast
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-card border-border'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : isPast ? 'text-white' : step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold ${isActive ? 'text-orange-600' : ''}`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-600 animate-pulse">
                          PROCESSING
                        </Badge>
                      )}
                      {isPast && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
                          ✓ DONE
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">{step.sub}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Tech stack badges */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" /> Technology Stack
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <TechGroup label="Frontend" items={['Next.js 16', 'React', 'TypeScript', 'Tailwind', 'shadcn/ui', 'Recharts', 'Leaflet-ready GIS']} />
            <TechGroup label="Backend" items={['Python', 'FastAPI', 'WebSocket', 'REST APIs']} />
            <TechGroup label="AI / ML" items={['PyTorch', 'TensorFlow', 'ConvLSTM', 'U-Net / 3D U-Net', 'Ensemble']} />
            <TechGroup label="Data / Streaming" items={['PostgreSQL', 'PostGIS', 'TimescaleDB', 'Apache Kafka', 'MQTT', 'Socket.IO']} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TechGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map(i => (
          <Badge key={i} variant="outline" className="text-[10px] h-4 px-1 py-0">
            {i}
          </Badge>
        ))}
      </div>
    </div>
  )
}
