// ============================================================================
// GET /api/weather/map-data
// Batched current weather for every bundled India map point.
//
// Open-Meteo supports multiple comma-separated coordinates in one request.
// We batch the bundled locations to keep requests small and cache the result
// briefly. This is what powers the actual coloured Temperature / Rainfall /
// Wind / Risk layers instead of drawing every city with the same orange dot.
// ============================================================================

import { NextResponse } from 'next/server'
import { ALL_UNIFIED_LOCATIONS } from '@/lib/india-cities'
import type { UnifiedLocation } from '@/lib/india-cities'
import { getDataSource } from '@/services/weather/weatherService'
import { mapRiskLevel, weatherRiskScore } from '@/services/weather/mapRisk'
import type { ApiResponse, MapWeatherPayload, MapWeatherPoint } from '@/services/weather/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_MS = 45_000
const BATCH_SIZE = 80
const TIMEOUT_MS = 18_000

type RawPoint = {
  latitude: number
  longitude: number
  timezone?: string
  utc_offset_seconds?: number
  current?: {
    time: number | string
    interval?: number
    temperature_2m: number
    relative_humidity_2m: number
    precipitation: number
    weather_code: number
    wind_speed_10m: number
    wind_gusts_10m?: number
  }
}

let memoryCache: { expiresAt: number; payload: MapWeatherPayload } | null = null

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function epochMs(v: number | string | undefined): number {
  if (typeof v === 'number') return v * 1000
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n * 1000
    const parsed = Date.parse(v)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}

async function fetchBatch(batch: readonly UnifiedLocation[]): Promise<MapWeatherPoint[]> {
  const params = new URLSearchParams({
    latitude: batch.map(p => p.lat).join(','),
    longitude: batch.map(p => p.lng).join(','),
    timezone: 'Asia/Kolkata',
    timeformat: 'unixtime',
    models: 'best_match',
    cell_selection: 'land',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
    ].join(','),
    forecast_days: '1',
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Open-Meteo map request HTTP ${res.status}`)
    const raw = await res.json() as RawPoint | RawPoint[]
    const rows = Array.isArray(raw) ? raw : [raw]

    return batch.flatMap((loc, i) => {
      const c = rows[i]?.current
      if (!c) return []
      const pointBase = {
        temperature: Number(c.temperature_2m),
        precipitation: Number(c.precipitation ?? 0),
        windSpeed: Number(c.wind_speed_10m ?? 0),
        windGusts: c.wind_gusts_10m == null ? undefined : Number(c.wind_gusts_10m),
        weatherCode: Number(c.weather_code ?? 0),
      }
      const riskScore = weatherRiskScore(pointBase)
      return [{
        id: loc.id,
        name: loc.name,
        state: loc.state,
        lat: loc.lat,
        lng: loc.lng,
        temperature: Math.round(pointBase.temperature * 10) / 10,
        humidity: Math.round(Number(c.relative_humidity_2m ?? 0)),
        precipitation: Math.round(pointBase.precipitation * 10) / 10,
        windSpeed: Math.round(pointBase.windSpeed * 10) / 10,
        windGusts: pointBase.windGusts == null ? undefined : Math.round(pointBase.windGusts * 10) / 10,
        weatherCode: pointBase.weatherCode,
        observedAt: epochMs(c.time),
        riskScore,
        riskLevel: mapRiskLevel(riskScore),
      } satisfies MapWeatherPoint]
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  if (getDataSource() !== 'real') {
    return NextResponse.json<ApiResponse<MapWeatherPayload>>({
      ok: false,
      data: null,
      error: 'Nationwide colour layers require Real API mode',
      dataSource: 'simulator',
      providerName: 'Simulator',
    })
  }

  const now = Date.now()
  if (memoryCache && memoryCache.expiresAt > now) {
    return NextResponse.json<ApiResponse<MapWeatherPayload>>({
      ok: true,
      data: memoryCache.payload,
      error: null,
      cachedAt: memoryCache.payload.fetchedAt,
      dataSource: 'real',
      providerName: 'Open-Meteo',
    }, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    })
  }

  try {
    // A few compact concurrent requests instead of one request per city.
    const batches = chunks([...ALL_UNIFIED_LOCATIONS], BATCH_SIZE)
    const settled = await Promise.allSettled(batches.map(fetchBatch))
    const points = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

    if (points.length === 0) throw new Error('No nationwide live weather points returned')

    const payload: MapWeatherPayload = {
      points,
      fetchedAt: Date.now(),
      providerName: 'Open-Meteo',
      dataSource: 'real',
    }
    memoryCache = { expiresAt: Date.now() + CACHE_MS, payload }

    const failed = settled.filter(r => r.status === 'rejected').length
    return NextResponse.json<ApiResponse<MapWeatherPayload>>({
      ok: true,
      data: payload,
      error: failed ? `${failed} map-data batch(es) failed; showing available live points.` : null,
      dataSource: 'real',
      providerName: 'Open-Meteo',
    }, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    })
  } catch (err) {
    // If a previous live map exists, keep it visible rather than replacing it
    // with fake colours.
    if (memoryCache?.payload) {
      return NextResponse.json<ApiResponse<MapWeatherPayload>>({
        ok: true,
        data: memoryCache.payload,
        error: err instanceof Error ? err.message : 'Map data refresh failed',
        stale: true,
        dataSource: 'real',
        providerName: 'Open-Meteo',
      })
    }

    return NextResponse.json<ApiResponse<MapWeatherPayload>>({
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : 'Map data refresh failed',
      dataSource: 'real',
      providerName: 'Open-Meteo',
    })
  }
}
