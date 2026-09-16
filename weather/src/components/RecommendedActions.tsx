'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { adaptRealForecastForDashboard } from '@/lib/real-dashboard-weather'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { t, hazardLabel } from '@/lib/translations'
import {
  generateForecast, riskLevelFromScore, locationSeed, Random,
} from '@/lib/weather-engine'
import { HazardType } from '@/lib/types'
import {
  User, Sprout, ShieldCheck, Phone, MessageSquare, Volume2, Radio,
  ArrowRight, Tractor, Wheat, Building2,
} from 'lucide-react'

interface Props {
  liveRiskOverride?: number
}

export function RecommendedActions({ liveRiskOverride }: Props) {
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

  const peak = data.hourly.reduce((max, h) => h.risk > max.risk ? h : max, data.hourly[0])
  const liveRisk = liveRiskOverride ?? peak.risk
  const level = riskLevelFromScore(liveRisk)
  const hazard = peak.hazard

  const citizenActions = getCitizenActions(lang, hazard, level)
  const farmerActions = getFarmerActions(lang, hazard, level)
  const authorityActions = getAuthorityActions(lang, hazard, level)

  return (
    <Card id="recommended-actions" className="scroll-mt-32">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          {t(lang, 'recommended_action')} — Multi-Audience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="citizen">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="citizen" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <User className="h-3.5 w-3.5" />
              <span>{t(lang, 'citizen_alert')}</span>
            </TabsTrigger>
            <TabsTrigger value="farmer" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <Sprout className="h-3.5 w-3.5" />
              <span>{t(lang, 'farmer_alert')}</span>
            </TabsTrigger>
            <TabsTrigger value="authority" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t(lang, 'authority_alert')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="citizen" className="mt-3 space-y-2">
            <AlertHeader
              icon={<User className="h-3.5 w-3.5" />}
              title={t(lang, 'citizen_alert')}
              hazard={hazard}
              risk={liveRisk}
              lang={lang}
            />
            <ActionList actions={citizenActions} />
            <ChannelRow />
          </TabsContent>

          <TabsContent value="farmer" className="mt-3 space-y-2">
            <AlertHeader
              icon={<Tractor className="h-3.5 w-3.5" />}
              title={t(lang, 'farmer_alert')}
              hazard={hazard}
              risk={liveRisk}
              lang={lang}
            />
            <ActionList actions={farmerActions} />
            <ChannelRow />
          </TabsContent>

          <TabsContent value="authority" className="mt-3 space-y-2">
            <AlertHeader
              icon={<Building2 className="h-3.5 w-3.5" />}
              title={t(lang, 'authority_alert')}
              hazard={hazard}
              risk={liveRisk}
              lang={lang}
            />
            <ActionList actions={authorityActions} />
            <ChannelRow authority />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function AlertHeader({ icon, title, hazard, risk, lang }: {
  icon: React.ReactNode
  title: string
  hazard: HazardType
  risk: number
  lang: ReturnType<typeof useAppStore.getState>['language']
}) {
  const level = riskLevelFromScore(risk)
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {hazardLabel(lang, hazard)} · Risk {risk}/100 · {level.replace('_', ' ')}
          </p>
        </div>
      </div>
      <Badge
        variant={level === 'extreme' || level === 'very_high' ? 'destructive' : 'outline'}
        className="text-xs"
      >
        {level.toUpperCase()}
      </Badge>
    </div>
  )
}

function ActionList({ actions }: { actions: string[] }) {
  return (
    <ul className="space-y-1">
      {actions.map((a, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <ArrowRight className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
          <span>{a}</span>
        </li>
      ))}
    </ul>
  )
}

function ChannelRow({ authority }: { authority?: boolean }) {
  const { language } = useAppStore()
  const lang = language
  const channels = authority
    ? [
        { icon: Radio, label: 'Authority Dashboard', desc: 'Live' },
        { icon: Phone, label: 'SMS to SDMA', desc: '5s' },
        { icon: MessageSquare, label: 'IVR Bridge', desc: '8s' },
        { icon: Volume2, label: 'Siren Trigger', desc: '2s' },
      ]
    : [
        { icon: MessageSquare, label: 'SMS', desc: '3s' },
        { icon: Phone, label: 'IVR Voice', desc: '6s' },
        { icon: Volume2, label: 'Siren', desc: '2s' },
        { icon: Radio, label: 'App Push', desc: '1s' },
      ]

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t">
      <span className="text-[10px] text-muted-foreground uppercase mr-1">Delivery</span>
      {channels.map((c, i) => {
        const Icon = c.icon
        return (
          <Badge key={i} variant="outline" className="text-[10px] gap-1 py-0.5 px-1.5">
            <Icon className="h-2.5 w-2.5" />
            {c.label}
            <span className="text-emerald-600 ml-0.5">{c.desc}</span>
          </Badge>
        )
      })}
    </div>
  )
}

function getCitizenActions(lang: any, hazard: HazardType, level: string): string[] {
  const base = [t(lang, 'action_stay_indoors')]
  if (hazard === 'lightning' || hazard === 'thunderstorm') {
    base.push(
      t(lang, 'action_avoid_open_fields'),
      t(lang, 'action_avoid_isolated_trees'),
      t(lang, 'action_protect_electrical'),
      t(lang, 'action_avoid_travel'),
    )
  } else if (hazard === 'heavy_rain' || hazard === 'extreme_rain') {
    base.push(
      'Avoid low-lying areas and waterlogged roads',
      'Do not drive through standing water',
      'Keep emergency contacts handy',
      'Charge mobile phones and keep flashlights ready',
    )
  } else if (hazard === 'flash_flood' || hazard === 'flood' || hazard === 'cloudburst') {
    base.push(
      'Move to higher ground immediately',
      'Do not cross flowing water — even shallow streams can sweep you away',
      'Follow official evacuation orders',
      'Disconnect electrical mains',
    )
  } else if (hazard === 'cyclone') {
    base.push(
      'Move to designated cyclone shelters',
      'Secure doors, windows, and loose outdoor items',
      'Keep emergency kit with documents, water, and medication',
      'Stay away from coastal areas and riverbanks',
    )
  } else if (hazard === 'high_wind' || hazard === 'squall') {
    base.push(
      'Stay away from trees, hoardings, and weak structures',
      'Secure loose outdoor objects',
      'Avoid two-wheeler travel',
    )
  } else if (hazard === 'hail') {
    base.push(
      'Protect vehicles under covered parking',
      'Stay away from skylights and glass roofs',
      'Cover crops and outdoor equipment',
    )
  } else {
    base.push('Monitor local updates', 'Keep emergency kit ready')
  }
  if (level === 'extreme' || level === 'very_high') {
    base.push('Call 112 (Emergency) if in danger')
  }
  return base
}

function getFarmerActions(lang: any, hazard: HazardType, level: string): string[] {
  const base = [t(lang, 'action_move_crops')]
  if (hazard === 'heavy_rain' || hazard === 'extreme_rain' || hazard === 'cloudburst') {
    base.push(
      t(lang, 'action_protect_livestock'),
      t(lang, 'action_avoid_pesticide'),
      t(lang, 'action_check_drainage'),
      t(lang, 'action_move_equipment'),
      'Harvest mature crops immediately if possible',
      'Cover harvested produce with tarpaulin',
    )
  } else if (hazard === 'lightning' || hazard === 'thunderstorm') {
    base.push(
      'Stop all field operations and return to shelter',
      'Move livestock away from open fields and tall trees',
      'Disconnect irrigation pumps from power supply',
      'Avoid contact with metal farm implements',
    )
  } else if (hazard === 'hail') {
    base.push(
      'Cover standing crops with netting or tarpaulin',
      'Move harvested produce to covered storage',
      'Relocate livestock to covered sheds',
    )
  } else if (hazard === 'flash_flood' || hazard === 'flood') {
    base.push(
      'Move livestock to higher ground',
      'Abandon low-lying fields — prioritize life over crop',
      'Document crop damage for insurance claims',
    )
  } else if (hazard === 'high_wind' || hazard === 'cyclone') {
    base.push(
      'Stake tall crops like sugarcane and banana',
      'Prune dead branches near fields',
      'Secure farm equipment and stored grain',
    )
  }
  return base
}

function getAuthorityActions(lang: any, hazard: HazardType, level: string): string[] {
  const base = [t(lang, 'action_monitor_low_lying')]
  if (hazard === 'flash_flood' || hazard === 'flood' || hazard === 'cloudburst') {
    base.push(
      t(lang, 'action_prepare_response'),
      t(lang, 'action_inspect_drainage'),
      t(lang, 'action_prepare_evacuation'),
      'Coordinate with NDRF / SDRF teams',
      'Issue evacuation orders for vulnerable zones',
      'Open relief camps and stock emergency supplies',
    )
  } else if (hazard === 'lightning' || hazard === 'thunderstorm') {
    base.push(
      'Issue public advisories via SMS / IVR / siren',
      'Schools: consider early dismissal if peak hour aligns',
      'Suspend outdoor construction work',
      'Coordinate with power department for safety',
    )
  } else if (hazard === 'cyclone') {
    base.push(
      'Activate cyclone shelters and relief centres',
      'Coordinate with IMD / NDMA for cyclone track updates',
      'Begin preemptive evacuation of coastal villages',
      'Position NDRF teams in vulnerable districts',
    )
  } else if (hazard === 'heavy_rain' || hazard === 'extreme_rain') {
    base.push(
      t(lang, 'action_inspect_drainage'),
      'Monitor river and reservoir levels',
      'Pre-position pumps in waterlogged zones',
      'Alert traffic police for waterlogged roads',
    )
  } else {
    base.push(
      t(lang, 'action_prepare_response'),
      'Maintain situational awareness via dashboard',
    )
  }
  return base
}
