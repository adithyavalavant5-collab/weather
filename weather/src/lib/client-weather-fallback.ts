import { generateForecast, locationSeed, Random } from '@/lib/weather-engine'
import type { HazardType, HourlyForecast, IndianLocation } from '@/lib/types'
import type { RealForecast } from '@/services/weather/types'

/**
 * Builds an instant local forecast so slow first-time compilation/network calls
 * never leave the live-weather UI stuck on a spinner. Real API data replaces it
 * as soon as /api/weather/forecast responds.
 */
export function buildClientWeatherFallback(loc: {
  id: string
  name: string
  state: string
  lat: number
  lng: number
}): RealForecast {
  const synthLoc: IndianLocation = {
    id: loc.id,
    name: loc.name,
    state: loc.state,
    district: loc.name,
    type: 'city',
    lat: loc.lat,
    lng: loc.lng,
  }

  const now = new Date()
  const rng = new Random(locationSeed(synthLoc))
  const sim = generateForecast(synthLoc, now, rng)

  const current: RealForecast['current'] = {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: loc.lat,
    lng: loc.lng,
    temperature: sim.current.temperature,
    feelsLike: sim.current.feelsLike,
    humidity: sim.current.humidity,
    windSpeed: sim.current.windSpeed,
    windDirection: sim.current.windDirection,
    pressure: sim.current.pressure,
    precipitation: sim.current.rainfall,
    precipitationProbability: sim.hourly[1]?.probability ?? sim.hourly[0]?.probability ?? 0,
    cloudCover: sim.current.cloudCover,
    visibility: Math.round(sim.current.visibility * 1000),
    weatherCode: hazardToWmo(sim.hourly[0]?.hazard ?? 'normal'),
    condition: sim.current.condition,
    conditionIcon: '🌦️',
    observedAt: sim.current.updatedAt,
    dataSource: 'simulator',
    providerName: 'Local simulator (instant fallback)',
  }

  const hourly: RealForecast['hourly'] = sim.hourly.map((h: HourlyForecast, index) => ({
    time: new Date(h.isoTime).getTime(),
    temperature: sim.current.temperature + Math.round(Math.sin(index / 2) * 2),
    feelsLike: sim.current.feelsLike + Math.round(Math.sin(index / 2) * 2),
    precipitation: isRainHazard(h.hazard) ? Math.max(0.5, Math.round(h.risk / 10) / 2) : 0,
    precipitationProbability: h.probability,
    windSpeed: h.hazard === 'high_wind' || h.hazard === 'cyclone' ? 60 : sim.current.windSpeed,
    windDirection: sim.current.windDirection,
    humidity: sim.current.humidity,
    weatherCode: hazardToWmo(h.hazard),
    condition: h.expectedConditions,
  }))

  const daily: RealForecast['daily'] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() + i)
    const wave = Math.round(Math.sin((i + 1) * 1.3) * 2)
    return {
      date: day.getTime(),
      tempMax: current.temperature + 3 + wave,
      tempMin: current.temperature - 4 + wave,
      precipitation: i === 0 ? current.precipitation : Math.max(0, current.precipitation - i * 0.5),
      precipitationProbability: Math.max(5, (current.precipitationProbability ?? 0) - i * 4),
      windSpeedMax: current.windSpeed + 8,
      windGustsMax: current.windSpeed + 15,
      windDirectionDominant: current.windDirection,
      humidity: current.humidity,
      weatherCode: current.weatherCode,
      condition: current.condition,
    }
  })

  return {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: loc.lat,
    lng: loc.lng,
    current,
    hourly,
    daily,
    fetchedAt: Date.now(),
    dataSource: 'simulator',
    providerName: 'Local simulator (instant fallback)',
  }
}

function isRainHazard(h: HazardType): boolean {
  return h.includes('rain') || h === 'cloudburst' || h === 'flash_flood' || h === 'flood' || h === 'thunderstorm'
}

function hazardToWmo(h: HazardType): number {
  switch (h) {
    case 'normal': return 1
    case 'heavy_rain': return 63
    case 'extreme_rain': return 65
    case 'flash_flood':
    case 'flood': return 65
    case 'cloudburst': return 82
    case 'thunderstorm':
    case 'lightning': return 95
    case 'hail': return 96
    case 'high_wind':
    case 'cyclone': return 781
    case 'squall': return 771
    default: return 1
  }
}
