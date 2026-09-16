'use client'

import { useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { t, hazardLabel, riskLevelLabel } from '@/lib/translations'
import {
  generateStateRiskSummaries, riskColor, riskLevelFromScore, generateFeedbackEntries,
} from '@/lib/weather-engine'
import {
  Shield, AlertTriangle, Users, MapPin, Activity, Filter, Search,
  TrendingDown, TrendingUp, Target, RefreshCw, Database, Cpu, Brain,
  CheckCircle2, XCircle, AlertOctagon, Settings,
} from 'lucide-react'

interface Props {
  onPickState?: (stateCode: string) => void
}

export function AdminDashboard({ onPickState }: Props) {
  const { language, now, thresholds, setThresholds } = useAppStore()
  const lang = language

  // Computed every render — cheap for 20 states and 12 feedback entries
  const summaries = generateStateRiskSummaries(now)
  const feedback = generateFeedbackEntries(now)

  // Filters
  const [hazardFilter, setHazardFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = summaries.filter(s => {
    if (hazardFilter !== 'all' && s.topHazard !== hazardFilter) return false
    if (riskFilter !== 'all' && s.riskLevel !== riskFilter) return false
    if (search && !s.state.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalAlerts = summaries.reduce((sum, s) => sum + s.activeAlerts, 0)
  const totalPopAtRisk = summaries.reduce((sum, s) => sum + s.populationAtRisk, 0)
  const totalDistrictsAffected = summaries.reduce((sum, s) => sum + s.affectedDistricts, 0)
  const extremeStates = summaries.filter(s => s.riskLevel === 'extreme' || s.riskLevel === 'very_high').length

  // Calculate feedback metrics
  const accuracy = feedback.length > 0
    ? Math.round(feedback.reduce((s, f) => s + f.accuracy, 0) / feedback.length)
    : 0
  const falseAlarms = feedback.filter(f => f.falseAlarm).length
  const missedEvents = feedback.filter(f => f.missedEvent).length

  return (
    <div className="space-y-3">
      {/* Top KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={AlertOctagon}
          label="Active Alerts"
          value={totalAlerts}
          color="text-red-500"
          sub={`${extremeStates} states at very high+ risk`}
        />
        <KpiCard
          icon={Users}
          label="Population at Risk"
          value={totalPopAtRisk.toLocaleString('en-IN')}
          color="text-orange-500"
          sub="across all affected districts"
        />
        <KpiCard
          icon={MapPin}
          label="Districts Affected"
          value={totalDistrictsAffected}
          color="text-amber-500"
          sub="out of 500+ districts monitored"
        />
        <KpiCard
          icon={Target}
          label="Prediction Accuracy"
          value={`${accuracy}%`}
          color="text-emerald-500"
          sub={`${falseAlarms} false alarms · ${missedEvents} missed`}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs py-1.5">
            <Shield className="h-3.5 w-3.5 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Active Alerts
          </TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs py-1.5">
            <Brain className="h-3.5 w-3.5 mr-1" /> AI Feedback
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="text-xs py-1.5">
            <Settings className="h-3.5 w-3.5 mr-1" /> Thresholds
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-orange-500" />
                  {t(lang, 'state_wise_risk')} — All India
                </CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search state..."
                      className="h-7 w-32 text-xs pl-7"
                    />
                  </div>
                  <Select value={hazardFilter} onValueChange={setHazardFilter}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue placeholder="Hazard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hazards</SelectItem>
                      <SelectItem value="heavy_rain">Heavy Rain</SelectItem>
                      <SelectItem value="thunderstorm">Thunderstorm</SelectItem>
                      <SelectItem value="lightning">Lightning</SelectItem>
                      <SelectItem value="flash_flood">Flash Flood</SelectItem>
                      <SelectItem value="cloudburst">Cloudburst</SelectItem>
                      <SelectItem value="cyclone">Cyclone</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="elevated">Elevated</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="very_high">Very High</SelectItem>
                      <SelectItem value="extreme">Extreme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs">State</TableHead>
                      <TableHead className="text-xs text-right">Risk</TableHead>
                      <TableHead className="text-xs">Top Hazard</TableHead>
                      <TableHead className="text-xs text-right">Districts</TableHead>
                      <TableHead className="text-xs text-right">Pop. at Risk</TableHead>
                      <TableHead className="text-xs text-right">Alerts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(s => (
                      <TableRow
                        key={s.stateCode}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onPickState?.(s.stateCode)}
                      >
                        <TableCell>
                          <div className="font-medium text-xs">{s.state}</div>
                          <div className="text-[10px] text-muted-foreground">{s.stateCode}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <div className="h-2 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full"
                                style={{ width: `${s.overallRisk}%`, background: riskColor(s.riskLevel) }}
                              />
                            </div>
                            <span className="font-bold tabular-nums text-xs">{s.overallRisk}</span>
                          </div>
                          <div className="text-[10px] uppercase font-medium mt-0.5" style={{ color: riskColor(s.riskLevel) }}>
                            {riskLevelLabel(lang, s.riskLevel)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {hazardLabel(lang, s.topHazard)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {s.affectedDistricts}/{s.totalDistricts}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {s.populationAtRisk.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.activeAlerts > 0 ? (
                            <Badge variant="destructive" className="text-xs">{s.activeAlerts}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Active Alerts Log ({filtered.reduce((s, x) => s + x.activeAlerts, 0)})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1.5">
                  {filtered.flatMap(s =>
                    Array.from({ length: s.activeAlerts }).map((_, i) => ({
                      state: s.state,
                      stateCode: s.stateCode,
                      hazard: s.topHazard,
                      risk: s.overallRisk - i * 5,
                      level: riskLevelFromScore(s.overallRisk - i * 5),
                      timestamp: now - i * 5 * 60 * 1000,
                      location: `${s.state} — District ${i + 1}`,
                    })),
                  ).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
                      <div className="h-8 w-8 rounded shrink-0 flex items-center justify-center" style={{ background: riskColor(a.level) }}>
                        <AlertOctagon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase">{hazardLabel(lang, a.hazard as any)}</span>
                          <Badge variant="outline" className="text-[10px]" style={{ color: riskColor(a.level) }}>
                            {riskLevelLabel(lang, a.level)} · {a.risk}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {a.location} · Issued {new Date(a.timestamp).toLocaleTimeString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px]">SMS</Badge>
                        <Badge variant="outline" className="text-[10px]">IVR</Badge>
                        <Badge variant="outline" className="text-[10px]">Siren</Badge>
                      </div>
                    </div>
                  ))}
                  {filtered.reduce((s, x) => s + x.activeAlerts, 0) === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      No active alerts — all clear across filtered states
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Feedback Tab */}
        <TabsContent value="feedback" className="mt-3">
          <div className="grid md:grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <Target className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Avg Accuracy</p>
                    <p className="text-lg font-bold text-emerald-600 tabular-nums">{accuracy}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded bg-red-100 dark:bg-red-950 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">False Alarms</p>
                    <p className="text-lg font-bold text-red-600 tabular-nums">{falseAlarms}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Missed Events</p>
                    <p className="text-lg font-bold text-amber-600 tabular-nums">{missedEvents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-500" />
                Continuous Learning — Prediction vs Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs">Predicted Hazard</TableHead>
                      <TableHead className="text-xs">Actual Event</TableHead>
                      <TableHead className="text-xs text-right">Accuracy</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs">
                          <div className="font-medium">{hazardLabel(lang, f.predictedHazard)}</div>
                          <div className="text-[10px] text-muted-foreground">{f.predictedTime}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {f.actualEvent === f.predictedHazard ? (
                            <span className="text-emerald-600">✓ Matched</span>
                          ) : f.falseAlarm ? (
                            <span className="text-amber-600">No event occurred</span>
                          ) : (
                            <span className="text-red-600">✗ Actual: {f.actualEvent}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold tabular-nums text-xs ${f.accuracy > 75 ? 'text-emerald-600' : f.accuracy > 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {f.accuracy}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {f.falseAlarm ? (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">FALSE ALARM</Badge>
                          ) : f.missedEvent ? (
                            <Badge variant="outline" className="text-[10px] border-red-500 text-red-600">MISSED</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">CORRECT</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-orange-500" />
                Alert Threshold Engine — Configurable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ThresholdSlider
                label="Monitor Threshold"
                description="Below this → no alerts shown"
                value={thresholds.monitor}
                onChange={(v) => setThresholds({ ...thresholds, monitor: v })}
                color="#84cc16"
              />
              <ThresholdSlider
                label="Warning Threshold"
                description="Below this → monitor only; at/above → warning"
                value={thresholds.warning}
                onChange={(v) => setThresholds({ ...thresholds, warning: v })}
                color="#eab308"
              />
              <ThresholdSlider
                label="High Priority Threshold"
                description="At/above → high-priority warning (SMS + IVR + siren)"
                value={thresholds.highPriority}
                onChange={(v) => setThresholds({ ...thresholds, highPriority: v })}
                color="#f97316"
              />
              <ThresholdSlider
                label="Critical Emergency Threshold"
                description="At/above → critical emergency warning (all channels + evacuation)"
                value={thresholds.critical}
                onChange={(v) => setThresholds({ ...thresholds, critical: v })}
                color="#ef4444"
              />

              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="font-semibold mb-1">False Alarm Reduction</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Multi-source confirmation (radar + AWS + lightning)</li>
                  <li>✓ Confidence-score gating (alerts need confidence ≥ 60%)</li>
                  <li>✓ Hazard-specific thresholds (lightning: 80, hail: 70, rain: 60)</li>
                  <li>✓ Continuous retraining on past predictions vs. outcomes</li>
                  <li>✓ No critical alerts triggered from a single unreliable sensor</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Activity
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
            <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-base font-bold tabular-nums truncate">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ThresholdSlider({ label, description, value, onChange, color }: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={100}
        step={1}
        className="w-full"
      />
      <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}
