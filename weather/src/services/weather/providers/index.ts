// ============================================================================
// Provider Selector — picks the active provider based on env vars.
//   WEATHER_PROVIDER = "open-meteo" (default, no key) | "openweathermap" (key)
// Falls back to Open-Meteo if OpenWeatherMap is requested but unconfigured.
// ============================================================================

import { openMeteoProvider } from './openMeteo';
import { openWeatherMapProvider } from './openWeatherMap';
import type { WeatherProvider } from './types';

export function selectProvider(): WeatherProvider {
  const requested = (process.env.WEATHER_PROVIDER || 'open-meteo').trim().toLowerCase();
  if (requested === 'openweathermap') {
    if (openWeatherMapProvider.configured) return openWeatherMapProvider;
    console.warn(
      '[weather] WEATHER_PROVIDER=openweathermap but WEATHER_API_KEY is not set; ' +
      'falling back to Open-Meteo (no key required).',
    );
    return openMeteoProvider;
  }
  return openMeteoProvider; // default
}

export const ACTIVE_PROVIDER_NAME = selectProvider().name;
