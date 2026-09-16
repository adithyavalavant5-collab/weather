'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { t, hazardLabel } from '@/lib/translations'
import {
  MessageSquare, Phone, Volume2, Radio, Send, Bell, Play, CheckCircle2, Loader2,
} from 'lucide-react'
import { WeatherAlert } from '@/lib/types'

interface Props {
  latestAlert?: {
    id: string
    timestamp: number
    hazard: string
    risk: number
    message: string
    channels: string[]
  } | null
}

interface SimulatedDelivery {
  id: string
  channel: 'SMS' | 'IVR' | 'Siren' | 'Push' | 'Authority'
  status: 'pending' | 'sent' | 'delivered'
  timestamp: number
  recipient: string
  preview: string
}

export function AlertSimulation({ latestAlert }: Props) {
  const { location, language, alerts, pushAlert } = useAppStore()
  const lang = language
  const [simulatedDeliveries, setSimulatedDeliveries] = useState<SimulatedDelivery[]>([])
  const [isTriggering, setIsTriggering] = useState(false)
  const lastProcessedAlertId = useRef<string | null>(null)

  // Refactored: reusable delivery-simulation function (no setState in effect)
  const runSimulation = (alertId: string, alertMessage: string, locName: string, locState: string) => {
    const deliveries: SimulatedDelivery[] = [
      { id: `${alertId}-sms`, channel: 'SMS', status: 'pending', timestamp: Date.now(), recipient: `+91 9XXXXXXXXX (${locName})`, preview: alertMessage.slice(0, 120) + '...' },
      { id: `${alertId}-ivr`, channel: 'IVR', status: 'pending', timestamp: Date.now(), recipient: `IVR call → ${locState} SDMA`, preview: 'Outbound call queued...' },
      { id: `${alertId}-siren`, channel: 'Siren', status: 'pending', timestamp: Date.now(), recipient: `${locName} Community Siren`, preview: 'Siren activation command...' },
      { id: `${alertId}-push`, channel: 'Push', status: 'pending', timestamp: Date.now(), recipient: `Mobile App Users`, preview: 'Push notification payload sent...' },
      { id: `${alertId}-auth`, channel: 'Authority', status: 'pending', timestamp: Date.now(), recipient: `NDMA / SDMA Dashboard`, preview: 'Alert registered in authority queue...' },
    ]
    setSimulatedDeliveries(deliveries)
    setIsTriggering(true)

    deliveries.forEach((d, i) => {
      setTimeout(() => {
        setSimulatedDeliveries(prev => prev.map(x => x.id === d.id ? { ...x, status: 'sent' } : x))
      }, 500 + i * 800)
      setTimeout(() => {
        setSimulatedDeliveries(prev => prev.map(x => x.id === d.id ? { ...x, status: 'delivered' } : x))
      }, 1500 + i * 800)
    })
    setTimeout(() => setIsTriggering(false), 6000)
  }

  // When a new alert arrives via WebSocket, simulate the multi-channel delivery
  // (using setTimeout(0) to defer the state update out of the synchronous effect body)
  useEffect(() => {
    if (!latestAlert || !location) return
    if (lastProcessedAlertId.current === latestAlert.id) return
    lastProcessedAlertId.current = latestAlert.id
    const t = setTimeout(() => {
      runSimulation(latestAlert.id, latestAlert.message, location.name, location.state)
    }, 0)
    return () => clearTimeout(t)
  }, [latestAlert, location])

  const triggerManualTest = () => {
    if (!location) return
    const fakeAlertId = `manual-${Date.now()}`
    const fakeMessage = `TEST ALERT: Severe thunderstorm expected in ${location.name}, ${location.state} within 1 hour. Risk: 88%. SEEK SHELTER.`
    runSimulation(fakeAlertId, fakeMessage, location.name, location.state)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-red-500" />
            Multi-Channel Alert Delivery
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={triggerManualTest}
            disabled={isTriggering || !location}
            className="h-7 text-xs"
          >
            {isTriggering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Test Broadcast
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {simulatedDeliveries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No active broadcasts. Click "Test Broadcast" to simulate multi-channel alert delivery
            (SMS + IVR + Siren + Push + Authority Dashboard).
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {simulatedDeliveries.map(d => (
              <DeliveryRow key={d.id} delivery={d} />
            ))}
          </div>
        )}

        {/* Recent alerts log */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Radio className="h-3 w-3" /> Recent Alerts ({alerts.length})
          </p>
          <ScrollArea className="h-32 rounded-md border">
            <div className="divide-y">
              {alerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t(lang, 'no_active_alerts')}</p>
              ) : (
                alerts.slice(0, 20).map(a => (
                  <div key={a.id} className="px-2 py-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{hazardLabel(lang, a.hazard)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.issuedAt).toLocaleTimeString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{a.locationName}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

function DeliveryRow({ delivery }: { delivery: SimulatedDelivery }) {
  const ICON = {
    SMS: MessageSquare, IVR: Phone, Siren: Volume2, Push: Send, Authority: Radio,
  }[delivery.channel]

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
      <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${delivery.status === 'delivered' ? 'bg-emerald-100' : delivery.status === 'sent' ? 'bg-blue-100' : 'bg-amber-100'}`}>
        <ICON className={`h-3.5 w-3.5 ${delivery.status === 'delivered' ? 'text-emerald-600' : delivery.status === 'sent' ? 'text-blue-600' : 'text-amber-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{delivery.channel}</span>
          {delivery.status === 'delivered' ? (
            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> DELIVERED
            </Badge>
          ) : delivery.status === 'sent' ? (
            <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600">
              <Send className="h-2.5 w-2.5 mr-0.5" /> SENT
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
              <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> PENDING
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{delivery.recipient}</p>
        <p className="text-[10px] text-muted-foreground truncate italic">{delivery.preview}</p>
      </div>
    </div>
  )
}
