// ============================================================================
// Real-Weather TypeScript Types (NEW — additive, does NOT touch existing types.ts)
// All interfaces used by the live-weather service layer, API routes and UI.
// Strongly typed — no `any` anywhere.
// ============================================================================

/** Geographic coordinate. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A pickable Indian location (city / town / state capital / UT). */
export interface IndianCityLocation {
  id: string;
  name: string;
  state: string;
  district?: string;
  type: 'city' | 'town' | 'state_capital' | 'ut_capital' | 'district_hq';
  lat: number;
  lng: number;
  population?: number;
}

/** Current weather observation for a single point. */
export interface RealCurrentWeather {
  locationId: string;
  locationName: string;
  state: string;
  lat: number;
  lng: number;
  temperature: number;          // °C
  feelsLike: number;            // °C
  humidity: number;             // %
  windSpeed: number;            // km/h
  windDirection: number;        // degrees (meteorological, 0=N, 270=W)
  windGusts?: number;           // km/h
  pressure: number;             // hPa
  precipitation: number;        // mm (last hour)
  precipitationProbability: number; // % (next 1h)
  cloudCover: number;           // %
  visibility: number;           // m
  uvIndex?: number;
  weatherCode: number;          // WMO code
  condition: string;            // human-readable label
  conditionIcon?: string;       // emoji or icon name
  observedAt: number;            // epoch ms
  dataSource: 'real' | 'simulator';
  providerName: string;
}

/** One hour of forecast. */
export interface RealHourlyForecast {
  time: number;                 // epoch ms
  temperature: number;          // °C
  feelsLike?: number;
  precipitation: number;        // mm
  precipitationProbability: number; // %
  windSpeed: number;            // km/h
  windDirection: number;
  humidity: number;             // %
  weatherCode: number;
  condition: string;
}

/** One day of forecast. */
export interface RealDailyForecast {
  date: number;                 // epoch ms (midnight)
  tempMax: number;
  tempMin: number;
  precipitation: number;        // mm
  precipitationProbability: number; // %
  precipitationMax?: number;
  windSpeedMax: number;
  windGustsMax?: number;
  windDirectionDominant: number;
  humidity: number;
  weatherCode: number;
  condition: string;
  sunrise?: number;
  sunset?: number;
  uvIndexMax?: number;
}

/** Full forecast payload returned by the service. */
export interface RealForecast {
  locationId: string;
  locationName: string;
  state: string;
  lat: number;
  lng: number;
  current: RealCurrentWeather;
  hourly: RealHourlyForecast[];     // next 24h
  daily: RealDailyForecast[];       // next 7d (if supported)
  fetchedAt: number;
  dataSource: 'real' | 'simulator';
  providerName: string;
}

/** Severity tier for derived alerts. */
export type RealAlertSeverity = 'minor' | 'moderate' | 'severe' | 'extreme';

/** Source classification — IMPORTANT: distinguishes data-derived vs official. */
export type RealAlertSource = 'data_derived' | 'provider_official';

/** A single weather alert (derived from API data OR supplied by provider). */
export interface RealWeatherAlert {
  id: string;
  locationId: string;
  locationName: string;
  state: string;
  lat: number;
  lng: number;
  severity: RealAlertSeverity;
  source: RealAlertSource;
  hazard: string;               // e.g. 'heavy_rain', 'thunderstorm', 'cyclone'
  title: string;
  headline: string;
  description: string;
  reason: string;
  startsAt: number;             // epoch ms
  endsAt?: number;              // epoch ms
  issuedAt: number;
  updatedAt: number;
  providerName: string;
}


/** Risk tier used for nationwide live map colouring. */
export type MapRiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'very_high' | 'extreme';

/** Compact current-weather sample for one point on the nationwide map. */
export interface MapWeatherPoint {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windGusts?: number;
  weatherCode: number;
  observedAt: number;
  riskScore: number;
  riskLevel: MapRiskLevel;
}

export interface MapWeatherPayload {
  points: MapWeatherPoint[];
  fetchedAt: number;
  providerName: string;
  dataSource: 'real' | 'simulator';
}

/** Map layer selector for the live weather map. */
export type WeatherLayer = 'temperature' | 'precipitation' | 'wind' | 'alerts';

/** Status of a real-weather fetch (drives UI loading/error/stale states). */
export type FetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale';

/** Response wrapper for the API routes — always 200 with structured payload. */
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  errorCode?: WeatherErrorCode;
  stale?: boolean;
  cachedAt?: number;
  providerName?: string;
  dataSource?: 'real' | 'simulator';
}

/** Strongly-typed error codes for client-side branching. */
export type WeatherErrorCode =
  | 'INVALID_LOCATION'
  | 'API_TIMEOUT'
  | 'API_RATE_LIMIT'
  | 'INVALID_API_KEY'
  | 'NETWORK_FAILURE'
  | 'MISSING_FORECAST'
  | 'MALFORMED_RESPONSE'
  | 'PROVIDER_UNCONFIGURED'
  | 'UNKNOWN';

/** Service health snapshot — used by /api/weather/health. */
export interface WeatherServiceHealth {
  status: 'ok' | 'degraded' | 'down';
  dataSource: 'real' | 'simulator';
  providerName: string;
  providerConfigured: boolean;
  cacheTtlMs: number;
  refreshIntervalMs: number;
  lastSuccessfulFetch: number | null;
  lastError: string | null;
  uptimeMs: number;
}

/** Normalized location search result. */
export interface LocationSearchResult {
  id: string;
  name: string;
  state: string;
  district?: string;
  type: IndianCityLocation['type'];
  lat: number;
  lng: number;
  population?: number;
}
