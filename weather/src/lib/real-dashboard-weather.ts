import type { RealForecast, RealHourlyForecast } from '@/services/weather/types'
import { weatherRiskScore } from '@/services/weather/mapRisk'
import { riskLevelFromScore } from '@/lib/weather-engine'
import type { CurrentWeather, HazardScore, HazardType, HourlyForecast } from '@/lib/types'

export interface DashboardWeatherSnapshot {
  current: CurrentWeather
  hazards: HazardScore[]
  hourly: HourlyForecast[]
  overallRisk: number
  topHazard: HazardType
  confidence: number
}

function formatTimeLabel(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function hazardFromHour(h: RealHourlyForecast): HazardType {
  if (h.windSpeed >= 62) return 'high_wind'
  if (h.weatherCode === 99 || h.weatherCode === 96) return 'lightning'
  if (h.weatherCode === 95) return 'thunderstorm'
  if (h.weatherCode === 82 || h.weatherCode === 65 || h.weatherCode === 67 || h.precipitation >= 12) return 'extreme_rain'
  if ([80, 81, 63, 61].includes(h.weatherCode) || h.precipitation >= 2.5) return 'heavy_rain'
  if ([75, 77].includes(h.weatherCode)) return 'hail'
  return 'normal'
}

function actionFor(hazard: HazardType, risk: number): string {
  if (risk <= 20 || hazard === 'normal') return 'No action needed — monitor live updates'
  switch (hazard) {
    case 'lightning': return 'Stay indoors and avoid open fields, tall isolated trees, and exposed metal.'
    case 'thunderstorm': return 'Seek sturdy shelter and avoid unnecessary travel until the storm passes.'
    case 'heavy_rain':
    case 'extreme_rain': return 'Avoid low-lying and waterlogged roads; monitor local authority advisories.'
    case 'high_wind':
    case 'squall': return 'Secure loose objects and stay away from trees, hoardings, and weak structures.'
    case 'hail': return 'Move indoors and protect vehicles, crops, and livestock where possible.'
    default: return 'Monitor live weather and follow local authority instructions.'
  }
}

function riskForHour(h: RealHourlyForecast): number {
  let risk = weatherRiskScore({
    temperature: h.temperature,
    precipitation: h.precipitation,
    windSpeed: h.windSpeed,
    weatherCode: h.weatherCode,
  })
  if (h.precipitationProbability >= 80 && h.precipitation > 0.1) risk = Math.max(risk, 64)
  else if (h.precipitationProbability >= 60 && h.precipitation > 0.1) risk = Math.max(risk, 48)
  else if (h.precipitationProbability >= 40 && h.precipitation > 0.1) risk = Math.max(risk, 32)
  return Math.min(100, Math.round(risk))
}

export function adaptRealForecastForDashboard(fc: RealForecast): DashboardWeatherSnapshot {
  const c = fc.current
  const current: CurrentWeather = {
    temperature: c.temperature,
    rainfall: c.precipitation,
    rainfallIntensity: c.precipitation,
    humidity: c.humidity,
    windSpeed: c.windSpeed,
    windDirection: c.windDirection,
    pressure: c.pressure,
    visibility: Math.round((c.visibility / 1000) * 10) / 10,
    cloudCover: c.cloudCover,
    feelsLike: c.feelsLike,
    condition: c.condition,
    updatedAt: c.observedAt,
  }

  const sourceHours = fc.hourly.length > 0 ? fc.hourly.slice(0, 7) : [{
    time: c.observedAt,
    temperature: c.temperature,
    precipitation: c.precipitation,
    precipitationProbability: c.precipitationProbability,
    windSpeed: c.windSpeed,
    windDirection: c.windDirection,
    humidity: c.humidity,
    weatherCode: c.weatherCode,
    condition: c.condition,
  } satisfies RealHourlyForecast]

  const hourly: HourlyForecast[] = sourceHours.map((h, i) => {
    const risk = riskForHour(h)
    const hazard = hazardFromHour(h)
    const timeLabel = formatTimeLabel(h.time)
    return {
      hourOffset: i,
      timeLabel,
      isoTime: new Date(h.time).toISOString(),
      hazard,
      probability: hazard === 'heavy_rain' || hazard === 'extreme_rain' || hazard === 'thunderstorm' || hazard === 'lightning'
        ? Math.max(h.precipitationProbability, Math.min(99, risk))
        : Math.min(99, risk),
      severity: Math.min(99, Math.round(risk * 0.95 + 4)),
      confidence: 80,
      risk,
      riskLevel: riskLevelFromScore(risk),
      expectedStart: i === 0 ? 'In progress / current hour' : timeLabel,
      duration: '≈ 1 hour',
      expectedConditions: h.condition,
      recommendedAction: actionFor(hazard, risk),
    }
  })

  const hazardMap = new Map<HazardType, HazardScore>()
  const updateHazard = (hazard: HazardType, probability: number, risk: number) => {
    if (hazard === 'normal') return
    const prev = hazardMap.get(hazard)
    const score: HazardScore = {
      hazard,
      probability: Math.min(99, Math.round(probability)),
      severity: Math.min(99, Math.round(risk * 0.95 + 4)),
      confidence: 80,
      risk,
    }
    if (!prev || score.risk > prev.risk) hazardMap.set(hazard, score)
  }

  for (const h of sourceHours) {
    const risk = riskForHour(h)
    const hazard = hazardFromHour(h)
    updateHazard(hazard, Math.max(h.precipitationProbability, risk), risk)
    if (h.windSpeed >= 40) updateHazard('high_wind', Math.min(99, risk + 5), Math.max(45, risk))
    if (h.precipitation >= 2.5) updateHazard('heavy_rain', Math.max(h.precipitationProbability, risk), risk)
    if (h.precipitation >= 12) updateHazard('extreme_rain', Math.max(h.precipitationProbability, risk), risk)
  }

  const defaults: HazardType[] = ['heavy_rain', 'thunderstorm', 'high_wind', 'extreme_rain', 'lightning', 'flood']
  for (const hazard of defaults) {
    if (!hazardMap.has(hazard)) {
      hazardMap.set(hazard, { hazard, probability: 3, severity: 5, confidence: 80, risk: 3 })
    }
  }

  const hazards = [...hazardMap.values()].sort((a, b) => b.risk - a.risk).slice(0, 6)
  const peak = hourly.reduce((best, h) => h.risk > best.risk ? h : best, hourly[0])

  return {
    current,
    hazards,
    hourly,
    overallRisk: peak?.risk ?? 0,
    topHazard: peak?.hazard ?? 'normal',
    confidence: 80,
  }
}
