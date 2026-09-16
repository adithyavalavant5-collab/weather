// ============================================================================
// Weather Provider Abstraction
// Any provider (Open-Meteo, OpenWeatherMap, etc.) implements this interface.
// weatherService.ts picks the active provider based on env vars at runtime.
// ============================================================================

import type {
  GeoPoint,
  IndianCityLocation,
  RealCurrentWeather,
  RealForecast,
  RealWeatherAlert,
} from '../types';

/** Minimal location info every provider method receives. */
export type ProviderLocation = Pick<
  IndianCityLocation,
  'id' | 'name' | 'state'
>;

export interface WeatherProvider {
  /** Provider name, surfaced to the UI for transparency. */
  readonly name: string;

  /** Whether the provider is properly configured (key, base URL, etc). */
  readonly configured: boolean;

  /** Fetch the current weather for a single lat/lng point. */
  fetchCurrent(
    point: GeoPoint,
    location: ProviderLocation,
  ): Promise<RealCurrentWeather>;

  /** Fetch the full forecast (current + hourly + daily) for a single point. */
  fetchForecast(
    point: GeoPoint,
    location: ProviderLocation,
  ): Promise<RealForecast>;

  /** Fetch provider-supplied official alerts (if any). Default = none. */
  fetchAlerts?(point: GeoPoint): Promise<RealWeatherAlert[]>;
}
