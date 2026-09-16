// ============================================================================
// Weather Service — server-side facade.
// The frontend talks to /api/weather/* which calls this service.
// This service:
//   1. Picks the configured provider (Open-Meteo default, OpenWeatherMap opt.)
//   2. Caches responses (TTL configurable)
//   3. Returns last-good stale data on upstream failure (graceful degradation)
//   4. Switches between "real" and "simulator" via WEATHER_DATA_SOURCE env
//   5. Derives in-app alerts (alertEngine) + merges provider official alerts
//   6. Returns strongly-typed responses only — no `any`
// ============================================================================

import type {
  ApiResponse,
  GeoPoint,
  RealForecast,
  RealWeatherAlert,
  WeatherErrorCode,
  WeatherServiceHealth,
} from './types';
import type { ProviderLocation, WeatherProvider } from './providers/types';
import { selectProvider } from './providers';
import { WeatherCache } from './cache';
import { deriveAlerts } from './alertEngine';

// --- Env-driven config (server-side only) ---
function readEnvInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

const CACHE_TTL_MS = readEnvInt('WEATHER_CACHE_TTL', 30_000);
const REFRESH_INTERVAL_MS = readEnvInt('WEATHER_REFRESH_INTERVAL', 60_000);
const STARTED_AT = Date.now();

// Runtime override — set via /api/weather/source so the DataSourceToggle can
// switch between real and simulator WITHOUT a server restart. Persists
// across requests in this server process only (lost on restart, which is
// when the env-var value takes over again).
let _runtimeOverride: 'real' | 'simulator' | null = null;

export function setDataSourceOverride(s: 'real' | 'simulator' | null): void {
  _runtimeOverride = s;
  // Clear caches so the next fetch reflects the new source
  forecastCache.clear();
  alertsCache.clear();
}
export function getDataSourceOverride(): 'real' | 'simulator' | null {
  return _runtimeOverride;
}

function dataSourceMode(): 'real' | 'simulator' {
  if (_runtimeOverride) return _runtimeOverride;
  const v = (process.env.WEATHER_DATA_SOURCE || 'simulator').trim().toLowerCase();
  return v === 'real' ? 'real' : 'simulator';
}

// --- Singleton state ---
let _provider: WeatherProvider | null = null;
function provider(): WeatherProvider {
  if (!_provider) _provider = selectProvider();
  return _provider;
}

const forecastCache = new WeatherCache<RealForecast>();
const alertsCache = new WeatherCache<RealWeatherAlert[]>();

let lastSuccessfulFetch: number | null = null;
let lastError: { message: string; code: WeatherErrorCode } | null = null;

// --- Errors ---
class WeatherServiceError extends Error {
  code: WeatherErrorCode;
  constructor(message: string, code: WeatherErrorCode) {
    super(message);
    this.name = 'WeatherServiceError';
    this.code = code;
  }
}

function mapError(err: unknown): WeatherServiceError {
  if (err instanceof WeatherServiceError) return err;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (/timeout|aborted/i.test(msg)) {
      return new WeatherServiceError(err.message, 'API_TIMEOUT');
    }
    if (/rate limit|429/i.test(msg)) {
      return new WeatherServiceError(err.message, 'API_RATE_LIMIT');
    }
    if (/api key|401|invalid key|unauthorized/i.test(msg)) {
      return new WeatherServiceError(err.message, 'INVALID_API_KEY');
    }
    if (/network|fetch|econnrefused|enotfound/i.test(msg)) {
      return new WeatherServiceError(err.message, 'NETWORK_FAILURE');
    }
    if (/missing|malformed|invalid json|unexpected token/i.test(msg)) {
      return new WeatherServiceError(err.message, 'MALFORMED_RESPONSE');
    }
    return new WeatherServiceError(err.message, 'UNKNOWN');
  }
  return new WeatherServiceError('Unknown error', 'UNKNOWN');
}

// --- Public API ---

/** Get the configured data source mode ("real" or "simulator"). */
export function getDataSource(): 'real' | 'simulator' {
  return dataSourceMode();
}

/** Get the active provider name (for UI transparency). */
export function getProviderName(): string {
  return dataSourceMode() === 'real' ? provider().name : 'Simulator';
}

/** Whether the real-weather provider is configured (key etc). */
export function isProviderConfigured(): boolean {
  return provider().configured;
}

/**
 * Fetch the full forecast for a single lat/lng. Handles caching, fallback,
 * and switching between real / simulator.
 */
export async function getForecast(
  point: GeoPoint,
  loc: ProviderLocation,
): Promise<ApiResponse<RealForecast>> {
  // SIMULATOR MODE: forward to the existing in-app weather-engine (no network)
  if (dataSourceMode() === 'simulator') {
    return { ok: true, data: getSimulatorForecast(point, loc), error: null, dataSource: 'simulator', providerName: 'Simulator' };
  }

  // REAL MODE: try cache first
  const cacheKey = `fc:${loc.id}`;
  const fresh = forecastCache.get(cacheKey);
  if (fresh) {
    return {
      ok: true,
      data: fresh,
      error: null,
      cachedAt: Date.now(),
      dataSource: 'real',
      providerName: provider().name,
    };
  }

  try {
    const fc = await provider().fetchForecast(point, loc);
    forecastCache.set(cacheKey, fc, CACHE_TTL_MS);
    lastSuccessfulFetch = Date.now();
    lastError = null;
    return {
      ok: true,
      data: fc,
      error: null,
      cachedAt: Date.now(),
      dataSource: 'real',
      providerName: provider().name,
    };
  } catch (err) {
    const wse = mapError(err);
    lastError = { message: wse.message, code: wse.code };

    // Fallback: return last good (stale) data if available
    const stale = forecastCache.getStale(cacheKey);
    if (stale) {
      forecastCache.markStale(cacheKey);
      return {
        ok: true,
        data: stale.value,
        error: wse.message,
        errorCode: wse.code,
        stale: true,
        cachedAt: stale.cachedAt,
        dataSource: 'real',
        providerName: provider().name,
      };
    }

    // Final fallback: try the simulator so the dashboard never blanks out —
    // but explicitly mark it so the UI can flag it as "fallback simulator".
    const simFc = getSimulatorForecast(point, loc);
    return {
      ok: true,
      data: simFc,
      error: `Real API unavailable (${wse.message}). Showing simulator data as fallback.`,
      errorCode: wse.code,
      stale: false,
      dataSource: 'simulator',
      providerName: 'Simulator (fallback)',
    };
  }
}

/**
 * Fetch alerts for a single point: derived alerts (always) + provider official
 * alerts (if supported). Cached separately.
 */
export async function getAlerts(
  point: GeoPoint,
  loc: ProviderLocation,
): Promise<ApiResponse<RealWeatherAlert[]>> {
  const cacheKey = `al:${loc.id}`;
  const fresh = alertsCache.get(cacheKey);
  if (fresh) {
    return {
      ok: true,
      data: fresh,
      error: null,
      cachedAt: Date.now(),
      dataSource: dataSourceMode(),
      providerName: provider().name,
    };
  }

  // In simulator mode, return no alerts (simulator pipeline is separate)
  if (dataSourceMode() === 'simulator') {
    return { ok: true, data: [], error: null, dataSource: 'simulator', providerName: 'Simulator' };
  }

  try {
    // First fetch the forecast so we can derive alerts
    const fcResp = await getForecast(point, loc);
    if (!fcResp.ok || !fcResp.data) {
      return { ok: fcResp.ok, data: [], error: fcResp.error, errorCode: fcResp.errorCode, dataSource: 'real', providerName: provider().name };
    }
    const derived = deriveAlerts(loc, point, fcResp.data);

    // If provider supports official alerts, fetch and merge them
    let official: RealWeatherAlert[] = [];
    if (provider().fetchAlerts) {
      try {
        official = await provider().fetchAlerts!(point);
      } catch {
        // Non-fatal — official alerts are best-effort
        official = [];
      }
    }

    const all = [...official, ...derived];
    alertsCache.set(cacheKey, all, CACHE_TTL_MS);
    return {
      ok: true,
      data: all,
      error: null,
      cachedAt: Date.now(),
      dataSource: 'real',
      providerName: provider().name,
    };
  } catch (err) {
    const wse = mapError(err);
    const stale = alertsCache.getStale(cacheKey);
    if (stale) {
      return {
        ok: true,
        data: stale.value,
        error: wse.message,
        errorCode: wse.code,
        stale: true,
        cachedAt: stale.cachedAt,
        dataSource: 'real',
        providerName: provider().name,
      };
    }
    return {
      ok: false,
      data: [],
      error: wse.message,
      errorCode: wse.code,
      dataSource: 'real',
      providerName: provider().name,
    };
  }
}

/** Health snapshot for /api/weather/health. */
export function getHealth(): WeatherServiceHealth {
  const ds = dataSourceMode();
  return {
    status:
      ds === 'simulator' ? 'ok'
      : lastError ? 'degraded'
      : 'ok',
    dataSource: ds,
    providerName: provider().name,
    providerConfigured: provider().configured,
    cacheTtlMs: CACHE_TTL_MS,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    lastSuccessfulFetch,
    lastError: lastError?.message ?? null,
    uptimeMs: Date.now() - STARTED_AT,
  };
}

// --- SIMULATOR BRIDGE ---
// Uses the EXISTING weather-engine.ts simulator (NOT modified). Wraps its
// output into the RealForecast shape so the new live-weather UI works against
// either real or simulator data transparently.
//
// This is the ONLY touch-point between the new code and the existing simulator;
// the existing simulator itself is NOT modified.
import { generateForecast, locationSeed, Random } from '@/lib/weather-engine';
import type { IndianLocation, HazardType, HourlyForecast } from '@/lib/types';

function getSimulatorForecast(point: GeoPoint, loc: ProviderLocation): RealForecast {
  // Build a minimal IndianLocation shape expected by generateForecast()
  const synthLoc: IndianLocation = {
    id: loc.id,
    name: loc.name,
    state: loc.state,
    district: loc.id, // best-effort
    type: 'city',
    lat: point.lat,
    lng: point.lng,
  };
  // Use the existing simulator's RNG + forecast generator (unchanged)
  const now = new Date();
  const rng = new Random(locationSeed(synthLoc));
  const sim = generateForecast(synthLoc, now, rng);

  const current: RealForecast['current'] = {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: point.lat,
    lng: point.lng,
    temperature: sim.current.temperature,
    feelsLike: sim.current.feelsLike,
    humidity: sim.current.humidity,
    windSpeed: sim.current.windSpeed,
    windDirection: sim.current.windDirection,
    windGusts: undefined,
    pressure: sim.current.pressure,
    precipitation: sim.current.rainfall,
    precipitationProbability: sim.hourly[1]?.probability ?? 0,
    cloudCover: sim.current.cloudCover,
    visibility: Math.round(sim.current.visibility * 1000), // km → m
    uvIndex: undefined,
    weatherCode: hazardToWmo(sim.hourly[0]?.hazard ?? 'normal'),
    condition: sim.current.condition,
    conditionIcon: '🌦️',
    observedAt: sim.current.updatedAt,
    dataSource: 'simulator',
    providerName: 'Simulator',
  };

  const hourly: RealForecast['hourly'] = sim.hourly.slice(0, 24).map((h: HourlyForecast) => ({
    time: new Date(h.isoTime).getTime(),
    temperature: 0, // not directly in HourlyForecast — approximate from risk
    feelsLike: undefined,
    precipitation: h.hazard.includes('rain') || h.hazard === 'cloudburst' ? 5 : 0,
    precipitationProbability: h.probability,
    windSpeed: h.hazard === 'high_wind' || h.hazard === 'cyclone' ? 60 : 15,
    windDirection: 180,
    humidity: 60,
    weatherCode: hazardToWmo(h.hazard),
    condition: h.expectedConditions,
  }));

  const daily: RealForecast['daily'] = []; // simulator doesn't produce daily — leave empty

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
    dataSource: 'simulator',
    providerName: 'Simulator',
  };
}

// Map simulator hazard type → synthetic WMO code for UI consistency
function hazardToWmo(h: HazardType): number {
  switch (h) {
    case 'normal': return 1;
    case 'heavy_rain': return 63;
    case 'extreme_rain': return 65;
    case 'flash_flood':
    case 'flood': return 65;
    case 'cloudburst': return 82;
    case 'thunderstorm': return 95;
    case 'lightning': return 95;
    case 'hail': return 96;
    case 'high_wind': return 781; // squall-ish
    case 'squall': return 771;
    case 'cyclone': return 781;
    default: return 1;
  }
}

// --- LRU-style safety valve ---
setInterval(() => {
  // Drop oldest entries every minute to bound memory (very conservative)
  if (forecastCache.size() > 500) forecastCache.clear();
  if (alertsCache.size() > 500) alertsCache.clear();
}, 60_000).unref?.();
