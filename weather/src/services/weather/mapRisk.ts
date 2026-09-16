import type { WeatherLayer, MapRiskLevel, MapWeatherPoint } from './types'

export function mapRiskLevel(score: number): MapRiskLevel {
  if (score > 90) return 'extreme'
  if (score > 80) return 'very_high'
  if (score > 60) return 'high'
  if (score > 40) return 'elevated'
  if (score > 20) return 'moderate'
  return 'low'
}

export function riskColorForLevel(level: MapRiskLevel): string {
  switch (level) {
    case 'low': return '#22c55e'
    case 'moderate': return '#84cc16'
    case 'elevated': return '#eab308'
    case 'high': return '#f97316'
    case 'very_high': return '#ef4444'
    case 'extreme': return '#991b1b'
  }
}

/**
 * Lightweight weather-risk score for map colouring. This is not an official
 * warning classification; it is a transparent heuristic derived from the live
 * weather variables returned by the provider.
 */
export function weatherRiskScore(input: {
  temperature: number
  precipitation: number
  windSpeed: number
  windGusts?: number
  weatherCode: number
}): number {
  const { temperature, precipitation, windSpeed, windGusts = 0, weatherCode } = input
  let risk = 5

  // Current precipitation is the preceding/current model time-step amount.
  if (precipitation >= 20) risk = Math.max(risk, 96)
  else if (precipitation >= 12) risk = Math.max(risk, 88)
  else if (precipitation >= 7.5) risk = Math.max(risk, 74)
  else if (precipitation >= 2.5) risk = Math.max(risk, 52)
  else if (precipitation >= 0.5) risk = Math.max(risk, 30)
  else if (precipitation > 0) risk = Math.max(risk, 18)

  const peakWind = Math.max(windSpeed, windGusts)
  if (peakWind >= 100) risk = Math.max(risk, 96)
  else if (peakWind >= 75) risk = Math.max(risk, 86)
  else if (peakWind >= 62) risk = Math.max(risk, 72)
  else if (peakWind >= 40) risk = Math.max(risk, 50)
  else if (peakWind >= 30) risk = Math.max(risk, 32)

  if (temperature >= 46) risk = Math.max(risk, 92)
  else if (temperature >= 42) risk = Math.max(risk, 78)
  else if (temperature >= 38) risk = Math.max(risk, 55)
  else if (temperature >= 35) risk = Math.max(risk, 35)
  else if (temperature <= 0) risk = Math.max(risk, 72)
  else if (temperature <= 5) risk = Math.max(risk, 48)
  else if (temperature <= 10) risk = Math.max(risk, 28)

  // WMO weather-code based escalation.
  if (weatherCode === 99) risk = Math.max(risk, 94)
  else if (weatherCode === 96) risk = Math.max(risk, 86)
  else if (weatherCode === 95) risk = Math.max(risk, 74)
  else if (weatherCode === 82) risk = Math.max(risk, 82)
  else if (weatherCode === 81) risk = Math.max(risk, 60)
  else if (weatherCode === 80) risk = Math.max(risk, 38)
  else if (weatherCode === 67 || weatherCode === 65) risk = Math.max(risk, 74)
  else if (weatherCode === 63) risk = Math.max(risk, 52)
  else if (weatherCode === 61) risk = Math.max(risk, 30)
  else if (weatherCode === 75 || weatherCode === 77) risk = Math.max(risk, 70)
  else if (weatherCode === 73) risk = Math.max(risk, 48)

  return Math.max(0, Math.min(100, Math.round(risk)))
}

export function colorForMapLayer(layer: WeatherLayer, point: MapWeatherPoint): string {
  if (layer === 'temperature') {
    const t = point.temperature
    if (t < 5) return '#1e3a8a'
    if (t < 12) return '#0ea5e9'
    if (t < 18) return '#22c55e'
    if (t < 25) return '#84cc16'
    if (t < 32) return '#eab308'
    if (t < 38) return '#f97316'
    if (t < 42) return '#ef4444'
    return '#991b1b'
  }

  if (layer === 'precipitation') {
    const p = point.precipitation
    if (p < 0.1) return '#cbd5e1'
    if (p < 2.5) return '#93c5fd'
    if (p < 7.5) return '#3b82f6'
    if (p < 12) return '#1d4ed8'
    if (p < 21) return '#6d28d9'
    return '#a21caf'
  }

  if (layer === 'wind') {
    const w = Math.max(point.windSpeed, point.windGusts ?? 0)
    if (w < 15) return '#22c55e'
    if (w < 30) return '#84cc16'
    if (w < 40) return '#eab308'
    if (w < 62) return '#f97316'
    if (w < 75) return '#ef4444'
    return '#7f1d1d'
  }

  return riskColorForLevel(point.riskLevel)
}

export function labelForMapLayer(layer: WeatherLayer, point: MapWeatherPoint): string {
  if (layer === 'temperature') return `${point.temperature}°C`
  if (layer === 'precipitation') return `${point.precipitation.toFixed(1)} mm`
  if (layer === 'wind') return `${Math.round(Math.max(point.windSpeed, point.windGusts ?? 0))} km/h`
  return `${point.riskLevel.replace('_', ' ')} · ${point.riskScore}/100`
}
