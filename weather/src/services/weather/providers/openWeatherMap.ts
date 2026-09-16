// ============================================================================
// OpenWeatherMap Provider — OPTIONAL
// Used when WEATHER_PROVIDER=openweathermap and WEATHER_API_KEY is set.
// Free tier covers: Current, 5d/3h forecast, One Call API 3.0 (with alerts).
// Get a free API key: https://openweathermap.org/api
// ============================================================================

import type {
  GeoPoint,
  RealCurrentWeather,
  RealDailyForecast,
  RealForecast,
  RealHourlyForecast,
  RealWeatherAlert,
} from '../../types';
import type { ProviderLocation, WeatherProvider } from './types';
import { decodeWmo, degreesToCompass } from './wmoCodes';

const DEFAULT_BASE_URL = 'https://api.openweathermap.org';
const FETCH_TIMEOUT_MS = 8000;

function envKey(): string {
  return process.env.WEATHER_API_KEY?.trim() || '';
}
function envBase(): string {
  return process.env.WEATHER_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}
function configured(): boolean {
  return envKey().length > 0;
}

// OpenWeatherMap weather condition code → WMO-like info (mapped)
interface OwmCond { label: string; emoji: string; hazardous: boolean; }
const OWM_COND_MAP: Record<number, OwmCond> = {
  // Thunderstorms (2xx)
  200: { label: 'Thunderstorm with light rain', emoji: '⛈️', hazardous: true },
  201: { label: 'Thunderstorm with rain', emoji: '⛈️', hazardous: true },
  202: { label: 'Thunderstorm with heavy rain', emoji: '⛈️', hazardous: true },
  210: { label: 'Light thunderstorm', emoji: '⛈️', hazardous: true },
  211: { label: 'Thunderstorm', emoji: '⛈️', hazardous: true },
  212: { label: 'Heavy thunderstorm', emoji: '⛈️', hazardous: true },
  221: { label: 'Ragged thunderstorm', emoji: '⛈️', hazardous: true },
  230: { label: 'Thunderstorm with light drizzle', emoji: '⛈️', hazardous: true },
  231: { label: 'Thunderstorm with drizzle', emoji: '⛈️', hazardous: true },
  232: { label: 'Thunderstorm with heavy drizzle', emoji: '⛈️', hazardous: true },
  // Drizzle (3xx)
  300: { label: 'Light intensity drizzle', emoji: '🌦️', hazardous: false },
  301: { label: 'Drizzle', emoji: '🌦️', hazardous: false },
  302: { label: 'Heavy intensity drizzle', emoji: '🌧️', hazardous: true },
  310: { label: 'Light intensity drizzle rain', emoji: '🌦️', hazardous: false },
  311: { label: 'Drizzle rain', emoji: '🌦️', hazardous: false },
  312: { label: 'Heavy intensity drizzle rain', emoji: '🌧️', hazardous: true },
  313: { label: 'Shower rain and drizzle', emoji: '🌧️', hazardous: false },
  314: { label: 'Heavy shower rain and drizzle', emoji: '🌧️', hazardous: true },
  321: { label: 'Shower drizzle', emoji: '🌦️', hazardous: false },
  // Rain (5xx)
  500: { label: 'Light rain', emoji: '🌦️', hazardous: false },
  501: { label: 'Moderate rain', emoji: '🌧️', hazardous: true },
  502: { label: 'Heavy rain', emoji: '🌧️', hazardous: true },
  503: { label: 'Very heavy rain', emoji: '🌧️', hazardous: true },
  504: { label: 'Extreme rain', emoji: '⛈️', hazardous: true },
  511: { label: 'Freezing rain', emoji: '🌧️', hazardous: true },
  520: { label: 'Light shower rain', emoji: '🌦️', hazardous: false },
  521: { label: 'Shower rain', emoji: '🌧️', hazardous: true },
  522: { label: 'Heavy shower rain', emoji: '🌧️', hazardous: true },
  531: { label: 'Ragged shower rain', emoji: '🌧️', hazardous: true },
  // Snow (6xx)
  600: { label: 'Light snow', emoji: '🌨️', hazardous: false },
  601: { label: 'Snow', emoji: '🌨️', hazardous: true },
  602: { label: 'Heavy snow', emoji: '❄️', hazardous: true },
  611: { label: 'Sleet', emoji: '🌨️', hazardous: true },
  612: { label: 'Light shower sleet', emoji: '🌨️', hazardous: false },
  613: { label: 'Shower sleet', emoji: '🌨️', hazardous: true },
  615: { label: 'Light rain and snow', emoji: '🌨️', hazardous: false },
  616: { label: 'Rain and snow', emoji: '🌨️', hazardous: true },
  620: { label: 'Light shower snow', emoji: '🌨️', hazardous: false },
  621: { label: 'Shower snow', emoji: '🌨️', hazardous: true },
  622: { label: 'Heavy shower snow', emoji: '❄️', hazardous: true },
  // Atmosphere (7xx)
  701: { label: 'Mist', emoji: '🌫️', hazardous: false },
  711: { label: 'Smoke', emoji: '🌫️', hazardous: true },
  721: { label: 'Haze', emoji: '🌫️', hazardous: false },
  731: { label: 'Sand/dust whirls', emoji: '🌫️', hazardous: true },
  741: { label: 'Fog', emoji: '🌫️', hazardous: true },
  751: { label: 'Sand', emoji: '🌫️', hazardous: true },
  761: { label: 'Dust', emoji: '🌫️', hazardous: true },
  762: { label: 'Volcanic ash', emoji: '🌋', hazardous: true },
  771: { label: 'Squall', emoji: '🌬️', hazardous: true },
  781: { label: 'Tornado', emoji: '🌪️', hazardous: true },
  // Clear/Clouds (8xx)
  800: { label: 'Clear sky', emoji: '☀️', hazardous: false },
  801: { label: 'Few clouds', emoji: '🌤️', hazardous: false },
  802: { label: 'Scattered clouds', emoji: '⛅', hazardous: false },
  803: { label: 'Broken clouds', emoji: '☁️', hazardous: false },
  804: { label: 'Overcast clouds', emoji: '☁️', hazardous: false },
};
function decodeOwm(code: number): OwmCond {
  return OWM_COND_MAP[code] ?? { label: 'Unknown', emoji: '❔', hazardous: false };
}

// Convert OpenWeatherMap condition code to a synthetic WMO code for downstream use.
function owmToWmo(code: number): number {
  // Trivial mapping — preserves the original code for the WMO code field too.
  return code;
}

class ProviderError extends Error {
  code: 'API_TIMEOUT' | 'NETWORK_FAILURE' | 'MALFORMED_RESPONSE' | 'UNKNOWN';
  constructor(msg: string, code: 'API_TIMEOUT' | 'NETWORK_FAILURE' | 'MALFORMED_RESPONSE' | 'UNKNOWN') {
    super(msg); this.name = 'ProviderError'; this.code = code;
  }
}
class RateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = 'RateLimitError'; }
}
class ApiKeyError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ApiKeyError'; }
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 401) {
      throw new ApiKeyError('OpenWeatherMap: invalid API key (401)');
    }
    if (res.status === 429) {
      throw new RateLimitError('OpenWeatherMap: rate limit (429)');
    }
    if (!res.ok) {
      throw new ProviderError(
        `OpenWeatherMap HTTP ${res.status}`,
        res.status >= 500 ? 'NETWORK_FAILURE' : 'UNKNOWN',
      );
    }
    return res.json();
  } catch (err) {
    if (err instanceof ProviderError || err instanceof RateLimitError || err instanceof ApiKeyError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError('OpenWeatherMap: request timed out', 'API_TIMEOUT');
    }
    throw new ProviderError(
      `OpenWeatherMap network error: ${err instanceof Error ? err.message : 'unknown'}`,
      'NETWORK_FAILURE',
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---- OpenWeatherMap One Call API 3.0 (alerts + everything) ----
interface OwmOneCall {
  lat: number;
  lon: number;
  timezone: string;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    clouds: number;
    weather: { id: number; main: string; description: string; icon: string }[];
    visibility?: number;
    uvi?: number;
    rain?: { '1h'?: number };
  };
  hourly: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_deg: number;
    weather: { id: number }[];
    pop: number;
    rain?: { '1h'?: number };
  }[];
  daily: {
    dt: number;
    temp: { max: number; min: number };
    humidity: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: { id: number }[];
    pop: number;
    rain?: number;
    sunrise: number;
    sunset: number;
    uvi?: number;
  }[];
  alerts?: {
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
  }[];
}

function oneCallUrl(point: GeoPoint): string {
  const base = envBase();
  const key = encodeURIComponent(envKey());
  const q = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    appid: key,
    units: 'metric',
    exclude: 'minutely',
  });
  // OWM One Call API 3.0 path; older One Call 2.5 uses /data/2.5/onecall
  // We try 2.5 first since it's free-tier-friendly; if the user has a 3.0 sub,
  // they can override WEATHER_API_BASE_URL accordingly.
  return `${base}/data/2.5/onecall?${q.toString()}`;
}

function mapCurrent(
  point: GeoPoint,
  loc: ProviderLocation,
  raw: OwmOneCall,
): RealCurrentWeather {
  const c = raw.current;
  const cond = decodeOwm(c.weather[0]?.id ?? 0);
  return {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: point.lat,
    lng: point.lng,
    temperature: Math.round(c.temp),
    feelsLike: Math.round(c.feels_like),
    humidity: Math.round(c.humidity),
    windSpeed: Math.round(c.wind_speed * 3.6), // m/s -> km/h
    windDirection: Math.round(c.wind_deg),
    windGusts: c.wind_gust ? Math.round(c.wind_gust * 3.6) : undefined,
    pressure: Math.round(c.pressure),
    precipitation: c.rain?.['1h'] ? Math.round(c.rain['1h'] * 10) / 10 : 0,
    precipitationProbability: raw.hourly?.[0]?.pop
      ? Math.round(raw.hourly[0].pop * 100)
      : 0,
    cloudCover: Math.round(c.clouds),
    visibility: c.visibility ?? 10000,
    uvIndex: c.uvi !== undefined ? Math.round(c.uvi * 10) / 10 : undefined,
    weatherCode: owmToWmo(c.weather[0]?.id ?? 0),
    condition: cond.label,
    conditionIcon: cond.emoji,
    observedAt: c.dt * 1000,
    dataSource: 'real',
    providerName: 'OpenWeatherMap',
  };
}

function mapHourly(raw: OwmOneCall): RealHourlyForecast[] {
  return raw.hourly.slice(0, 24).map((h) => {
    const cond = decodeOwm(h.weather[0]?.id ?? 0);
    return {
      time: h.dt * 1000,
      temperature: Math.round(h.temp),
      feelsLike: Math.round(h.feels_like),
      precipitation: h.rain?.['1h'] ? Math.round(h.rain['1h'] * 10) / 10 : 0,
      precipitationProbability: Math.round(h.pop * 100),
      windSpeed: Math.round(h.wind_speed * 3.6),
      windDirection: Math.round(h.wind_deg),
      humidity: Math.round(h.humidity),
      weatherCode: owmToWmo(h.weather[0]?.id ?? 0),
      condition: cond.label,
    } satisfies RealHourlyForecast;
  });
}

function mapDaily(raw: OwmOneCall): RealDailyForecast[] {
  return raw.daily.slice(0, 7).map((d) => {
    const cond = decodeOwm(d.weather[0]?.id ?? 0);
    return {
      date: d.dt * 1000,
      tempMax: Math.round(d.temp.max),
      tempMin: Math.round(d.temp.min),
      precipitation: d.rain ? Math.round(d.rain * 10) / 10 : 0,
      precipitationProbability: Math.round(d.pop * 100),
      windSpeedMax: Math.round(d.wind_speed * 3.6),
      windGustsMax: d.wind_gust ? Math.round(d.wind_gust * 3.6) : undefined,
      windDirectionDominant: Math.round(d.wind_deg),
      humidity: Math.round(d.humidity),
      weatherCode: owmToWmo(d.weather[0]?.id ?? 0),
      condition: cond.label,
      sunrise: d.sunrise * 1000,
      sunset: d.sunset * 1000,
      uvIndexMax: d.uvi !== undefined ? Math.round(d.uvi * 10) / 10 : undefined,
    } satisfies RealDailyForecast;
  });
}

function mapAlerts(
  point: GeoPoint,
  loc: ProviderLocation,
  raw: OwmOneCall,
): RealWeatherAlert[] {
  if (!raw.alerts || raw.alerts.length === 0) return [];
  const now = Date.now();
  return raw.alerts.map((a, i) => {
    const tag = (a.tags?.[0] || a.event || 'unknown').toLowerCase();
    const severity = ((): RealWeatherAlert['severity'] => {
      if (/extreme|tornado|cyclone|hurricane|typhoon/.test(tag)) return 'extreme';
      if (/severe|storm|flood|heat|cold/.test(tag)) return 'severe';
      if (/moderate|wind|rain|snow/.test(tag)) return 'moderate';
      return 'minor';
    })();
    return {
      id: `owm-alert-${loc.id}-${i}-${a.start}`,
      locationId: loc.id,
      locationName: loc.name,
      state: loc.state,
      lat: point.lat,
      lng: point.lng,
      severity,
      source: 'provider_official' as const,
      hazard: tag,
      title: `${a.event} — ${loc.name}`,
      headline: a.event,
      description: a.description.slice(0, 1000),
      reason: `Official alert from ${a.sender_name}`,
      startsAt: a.start * 1000,
      endsAt: a.end ? a.end * 1000 : undefined,
      issuedAt: a.start * 1000,
      updatedAt: now,
      providerName: 'OpenWeatherMap',
    };
  });
}

export const openWeatherMapProvider: WeatherProvider = {
  name: 'OpenWeatherMap',
  configured,
  async fetchCurrent(point, loc) {
    if (!configured()) throw new ApiKeyError('OpenWeatherMap: WEATHER_API_KEY not set');
    const json = (await fetchJsonWithTimeout(oneCallUrl(point))) as OwmOneCall;
    return mapCurrent(point, loc, json);
  },
  async fetchForecast(point, loc) {
    if (!configured()) throw new ApiKeyError('OpenWeatherMap: WEATHER_API_KEY not set');
    const json = (await fetchJsonWithTimeout(oneCallUrl(point))) as OwmOneCall;
    const current = mapCurrent(point, loc, json);
    const hourly = mapHourly(json);
    const daily = mapDaily(json);
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
      providerName: 'OpenWeatherMap',
    } satisfies RealForecast;
  },
  async fetchAlerts(point) {
    // Alerts come bundled with One Call forecast; we fetch the forecast and pull alerts
    if (!configured()) return [];
    const json = (await fetchJsonWithTimeout(oneCallUrl(point))) as OwmOneCall;
    const dummyLoc: ProviderLocation = { id: `${point.lat},${point.lng}`, name: 'Unknown', state: 'Unknown' };
    return mapAlerts(point, dummyLoc, json);
  },
};

export { degreesToCompass, decodeWmo };
