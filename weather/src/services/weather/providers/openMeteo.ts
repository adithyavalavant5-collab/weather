// ============================================================================
// Open-Meteo Provider — DEFAULT
// Free, no API key, no signup required.
// https://open-meteo.com (commercial use allowed, fair-use rate limits)
// Provides: current weather, hourly forecast, daily forecast (7 days).
// Does NOT provide official severe-weather alerts — those are data-derived
// from conditions by ../alertEngine.ts.
// ============================================================================

import type {
  GeoPoint,
  RealCurrentWeather,
  RealDailyForecast,
  RealForecast,
  RealHourlyForecast,
} from '../../types';
import type { ProviderLocation, WeatherProvider } from './types';
import { decodeWmo, degreesToCompass } from './wmoCodes';

const DEFAULT_BASE_URL = 'https://api.open-meteo.com';
const FETCH_TIMEOUT_MS = 20000;
const FETCH_RETRIES = 1;

function envBase(): string {
  return process.env.OPEN_METEO_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

function configured(): boolean {
  // Open-Meteo needs no credentials; it is always available.
  return true;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  current?: {
    time: string | number;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly?: {
    time: Array<string | number>;
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    relative_humidity_2m: number[];
    weather_code: number[];
    visibility: number[];
    uv_index: number[];
  };
  daily?: {
    time: Array<string | number>;
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
}

function buildUrl(point: GeoPoint, mode: 'current' | 'forecast'): string {
  const base = envBase();
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    timezone: 'Asia/Kolkata',
    models: 'best_match',
    cell_selection: 'land',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_probability',
      'wind_speed_10m',
      'wind_direction_10m',
      'relative_humidity_2m',
      'weather_code',
      'visibility',
      'uv_index',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'sunrise',
      'sunset',
      'uv_index_max',
    ].join(','),
    forecast_days: '7',
    forecast_hours: '24',
    past_days: '0',
    timeformat: 'unixtime',
  });
  // mode is unused in URL itself but kept for future per-mode pruning
  void mode;
  return `${base}/v1/forecast?${params.toString()}`;
}

async function fetchOpenMeteo(point: GeoPoint): Promise<OpenMeteoResponse> {
  const url = buildUrl(point, 'forecast');
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.status === 429) {
        throw new RateLimitError('Open-Meteo rate limit reached');
      }
      if (!res.ok) {
        throw new ProviderError(
          `Open-Meteo HTTP ${res.status}`,
          res.status >= 500 ? 'NETWORK_FAILURE' : 'UNKNOWN',
        );
      }
      const json = (await res.json()) as OpenMeteoResponse;
      if (!json.current || !json.hourly || !json.daily) {
        throw new ProviderError('Open-Meteo: missing forecast fields', 'MALFORMED_RESPONSE');
      }
      return json;
    } catch (err) {
      lastError = err;
      if (err instanceof RateLimitError) throw err;
      if (attempt < FETCH_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const err = lastError;
  if (err instanceof ProviderError || err instanceof RateLimitError) throw err;
  if (err instanceof Error && err.name === 'AbortError') {
    throw new ProviderError('Open-Meteo request timed out', 'API_TIMEOUT');
  }
  throw new ProviderError(
    `Open-Meteo network error: ${err instanceof Error ? err.message : 'unknown'}`,
    'NETWORK_FAILURE',
  );
}

class ProviderError extends Error {
  code: 'API_TIMEOUT' | 'NETWORK_FAILURE' | 'MALFORMED_RESPONSE' | 'UNKNOWN';
  constructor(msg: string, code: 'API_TIMEOUT' | 'NETWORK_FAILURE' | 'MALFORMED_RESPONSE' | 'UNKNOWN') {
    super(msg);
    this.name = 'ProviderError';
    this.code = code;
  }
}
class RateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = 'RateLimitError'; }
}

function isoToEpochMs(value: string | number): number {
  if (typeof value === 'number') return value * 1000;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && value.trim() !== '') return numeric * 1000;
  return new Date(value).getTime();
}

function nearestHourlyIndex(raw: OpenMeteoResponse): number {
  const h = raw.hourly;
  const current = raw.current;
  if (!h?.time?.length || !current) return 0;
  const target = isoToEpochMs(current.time);
  let best = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 0; i < h.time.length; i++) {
    const delta = Math.abs(isoToEpochMs(h.time[i]) - target);
    if (delta < bestDelta) { best = i; bestDelta = delta; }
  }
  return best;
}

function mapCurrent(
  point: GeoPoint,
  loc: ProviderLocation,
  raw: OpenMeteoResponse,
): RealCurrentWeather {
  const c = raw.current!;
  const wmo = decodeWmo(c.weather_code);
  const currentHourIndex = nearestHourlyIndex(raw);
  const visibility =
    raw.hourly?.visibility?.[currentHourIndex] !== undefined
      ? Math.round(raw.hourly.visibility[currentHourIndex])
      : 10000;
  const uv = raw.hourly?.uv_index?.[currentHourIndex];
  return {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: point.lat,
    lng: point.lng,
    temperature: Math.round(c.temperature_2m * 10) / 10,
    feelsLike: Math.round(c.apparent_temperature * 10) / 10,
    humidity: Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m * 10) / 10,
    windDirection: Math.round(c.wind_direction_10m),
    windGusts: Math.round(c.wind_gusts_10m * 10) / 10,
    pressure: Math.round(c.pressure_msl),
    precipitation: Math.round(c.precipitation * 10) / 10,
    precipitationProbability:
      raw.hourly?.precipitation_probability?.[currentHourIndex] ?? 0,
    cloudCover: Math.round(c.cloud_cover),
    visibility,
    uvIndex: uv !== undefined ? Math.round(uv * 10) / 10 : undefined,
    weatherCode: c.weather_code,
    condition: wmo.label,
    conditionIcon: wmo.emoji,
    observedAt: isoToEpochMs(c.time),
    dataSource: 'real',
    providerName: 'Open-Meteo',
  };
}

function mapHourly(raw: OpenMeteoResponse): RealHourlyForecast[] {
  const h = raw.hourly!;
  const out: RealHourlyForecast[] = [];
  const now = Date.now();
  let count = 0;
  for (let i = 0; i < h.time.length && count < 24; i++) {
    const t = isoToEpochMs(h.time[i]);
    if (t < now - 30 * 60 * 1000) continue; // skip past hours
    const wmo = decodeWmo(h.weather_code[i]);
    out.push({
      time: t,
      temperature: Math.round(h.temperature_2m[i]),
      feelsLike:
        h.apparent_temperature?.[i] !== undefined
          ? Math.round(h.apparent_temperature[i])
          : undefined,
      precipitation: Math.round(h.precipitation[i] * 10) / 10,
      precipitationProbability: h.precipitation_probability?.[i] ?? 0,
      windSpeed: Math.round(h.wind_speed_10m[i]),
      windDirection: Math.round(h.wind_direction_10m[i]),
      humidity: Math.round(h.relative_humidity_2m[i]),
      weatherCode: h.weather_code[i],
      condition: wmo.label,
    });
    count++;
  }
  return out;
}

function mapDaily(raw: OpenMeteoResponse): RealDailyForecast[] {
  const d = raw.daily!;
  return d.time.map((iso, i) => {
    const wmo = decodeWmo(d.weather_code[i]);
    return {
      date: isoToEpochMs(iso),
      tempMax: Math.round(d.temperature_2m_max[i]),
      tempMin: Math.round(d.temperature_2m_min[i]),
      precipitation: Math.round(d.precipitation_sum[i] * 10) / 10,
      precipitationProbability: d.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax: Math.round(d.wind_speed_10m_max[i]),
      windGustsMax:
        d.wind_gusts_10m_max?.[i] !== undefined
          ? Math.round(d.wind_gusts_10m_max[i])
          : undefined,
      windDirectionDominant: Math.round(d.wind_direction_10m_dominant[i]),
      humidity: 0, // Open-Meteo daily doesn't include humidity — left as 0
      weatherCode: d.weather_code[i],
      condition: wmo.label,
      sunrise: d.sunrise?.[i] ? isoToEpochMs(d.sunrise[i]) : undefined,
      sunset: d.sunset?.[i] ? isoToEpochMs(d.sunset[i]) : undefined,
      uvIndexMax:
        d.uv_index_max?.[i] !== undefined
          ? Math.round(d.uv_index_max[i] * 10) / 10
          : undefined,
    } satisfies RealDailyForecast;
  });
}

export const openMeteoProvider: WeatherProvider = {
  name: 'Open-Meteo',
  configured: configured(),
  async fetchCurrent(point, loc) {
    const raw = await fetchOpenMeteo(point);
    return mapCurrent(point, loc, raw);
  },
  async fetchForecast(point, loc) {
    const raw = await fetchOpenMeteo(point);
    const current = mapCurrent(point, loc, raw);
    const hourly = mapHourly(raw);
    const daily = mapDaily(raw);
    return {
      locationId: loc.id,
      locationName: loc.name,
      state: loc.state,
      lat: point.lat,
      lng: point.lng,
      current,
      hourly,
      daily,
      fetchedAt: Date.now(),
      dataSource: 'real',
      providerName: 'Open-Meteo',
    } satisfies RealForecast;
  },
};

// Re-export helpers for testing / direct use
export { degreesToCompass, ProviderError, RateLimitError };
