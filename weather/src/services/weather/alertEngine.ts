// ============================================================================
// Alert Derivation Engine
// Generates "data_derived" alerts from real weather data (current + hourly +
// daily). Clearly distinct from "provider_official" alerts (e.g. OpenWeatherMap
// One Call API alerts). The UI MUST visually distinguish the two.
//
// IMPORTANT: These are NOT official government warnings. They are derived
// heuristics from publicly available weather data, intended to surface
// actionable thresholds for the public. Always defer to official IMD/NDMA
// channels when in doubt.
// ============================================================================

import type {
  GeoPoint,
  RealDailyForecast,
  RealForecast,
  RealHourlyForecast,
  RealWeatherAlert,
} from '../types';
import type { ProviderLocation } from './types';

// Heuristic thresholds (India context, IMD-style bands where possible)
const TH = {
  heavyRain1h: 7.5,        // mm in 1h — IMD "heavy rain" 64.5–124.4 mm/24h
  veryHeavyRain1h: 11.5,   // mm in 1h — IMD "very heavy" 115.5–204.4 mm/24h
  extremeRain1h: 21.0,     // mm in 1h — IMD "extremely heavy" > 204.4 mm/24h
  rainProbMin: 60,         // % precipitation probability to act on
  windStrong: 40,          // km/h
  windVeryStrong: 62,      // km/h
  windGustsSevere: 75,     // km/h
  heatMax: 42,             // °C
  coldMin: 6,              // °C
  thunderstormCode: 95,    // WMO code 95/96/99 = thunderstorm
  thunderstormProb: 65,    // %
  humidexHigh: 47,         // °C equivalent — extreme discomfort
};

type Severity = RealWeatherAlert['severity'];

function severityForRain(mmPerHour: number): Severity {
  if (mmPerHour >= TH.extremeRain1h) return 'extreme';
  if (mmPerHour >= TH.veryHeavyRain1h) return 'severe';
  if (mmPerHour >= TH.heavyRain1h) return 'moderate';
  return 'minor';
}
function severityForWind(kmh: number): Severity {
  if (kmh >= TH.windGustsSevere) return 'extreme';
  if (kmh >= TH.windVeryStrong) return 'severe';
  if (kmh >= TH.windStrong) return 'moderate';
  return 'minor';
}
function severityForTemp(c: number): Severity {
  if (c >= 47 || c <= 2) return 'extreme';
  if (c >= TH.heatMax || c <= TH.coldMin) return 'severe';
  return 'moderate';
}

function makeAlert(
  loc: ProviderLocation,
  point: GeoPoint,
  hazard: string,
  title: string,
  headline: string,
  description: string,
  reason: string,
  severity: Severity,
  startsAt: number,
  endsAt?: number,
): RealWeatherAlert {
  const now = Date.now();
  return {
    id: `derived-${loc.id}-${hazard}-${startsAt}`,
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: point.lat,
    lng: point.lng,
    severity,
    source: 'data_derived',
    hazard,
    title,
    headline,
    description,
    reason,
    startsAt,
    endsAt,
    issuedAt: now,
    updatedAt: now,
    providerName: 'Derived (in-app engine)',
  };
}

/**
 * Derive alerts from current + hourly + daily forecast for a single point.
 * Returns at most one alert per hazard family (de-duplicated by hazard key).
 */
export function deriveAlerts(
  loc: ProviderLocation,
  point: GeoPoint,
  fc: RealForecast,
): RealWeatherAlert[] {
  const alerts: RealWeatherAlert[] = [];
  const { current, hourly, daily } = fc;
  const now = Date.now();

  // 1. Heavy / very heavy / extreme rain — based on hourly precip in next 24h
  const heavyHours = hourly.filter(
    h => h.precipitation >= TH.heavyRain1h && h.precipitationProbability >= TH.rainProbMin,
  );
  if (heavyHours.length > 0) {
    const maxMm = Math.max(...heavyHours.map(h => h.precipitation));
    const severity = severityForRain(maxMm);
    const start = heavyHours[0].time;
    const end = heavyHours[heavyHours.length - 1].time + 3600 * 1000;
    const label =
      maxMm >= TH.extremeRain1h ? 'Extreme rainfall' :
      maxMm >= TH.veryHeavyRain1h ? 'Very heavy rainfall' : 'Heavy rainfall';
    alerts.push(makeAlert(
      loc, point, 'heavy_rain',
      `${label} expected — ${loc.name}`,
      label,
      `${maxMm.toFixed(1)} mm/hr expected around ${new Date(start).toLocaleTimeString('en-IN')}. ` +
      `${heavyHours.length} hour(s) above heavy-rain threshold in next 24h.`,
      `Hourly precipitation ${maxMm.toFixed(1)} mm/hr exceeds IMD heavy-rain band.`,
      severity, start, end,
    ));
  }

  // 2. Thunderstorm — based on WMO code 95/96/99 appearing in next 24h
  const stormHours = hourly.filter(
    h => h.weatherCode >= 95 && h.weatherCode <= 99 && h.precipitationProbability >= 30,
  );
  if (stormHours.length > 0) {
    const start = stormHours[0].time;
    const end = stormHours[stormHours.length - 1].time + 3600 * 1000;
    alerts.push(makeAlert(
      loc, point, 'thunderstorm',
      `Thunderstorm expected — ${loc.name}`,
      'Thunderstorm with lightning',
      `WMO code ${stormHours[0].weatherCode} detected in forecast around ${new Date(start).toLocaleTimeString('en-IN')}. ` +
      `Stay indoors, avoid open areas, and stay away from tall structures.`,
      `Forecast weather codes 95–99 indicate thunderstorm conditions.`,
      'severe', start, end,
    ));
  }

  // 3. Strong / damaging winds — based on hourly wind speed in next 24h
  const windHours = hourly.filter(h => h.windSpeed >= TH.windStrong);
  if (windHours.length > 0) {
    const maxWind = Math.max(...windHours.map(h => h.windSpeed));
    const severity = severityForWind(maxWind);
    const start = windHours[0].time;
    const end = windHours[windHours.length - 1].time + 3600 * 1000;
    alerts.push(makeAlert(
      loc, point, 'high_wind',
      `Strong winds expected — ${loc.name}`,
      `Wind up to ${maxWind} km/h`,
      `Sustained winds up to ${maxWind} km/h in next 24h. Secure loose objects, ` +
      `avoid travel if possible, and stay away from trees/hoardings.`,
      `Forecast hourly wind speed ${maxWind} km/h exceeds strong-wind threshold.`,
      severity, start, end,
    ));
  }

  // 4. Extreme temperatures — based on current + daily max/min
  if (current.temperature >= TH.heatMax) {
    alerts.push(makeAlert(
      loc, point, 'extreme_heat',
      `Extreme heat — ${loc.name}`,
      `Temperature ${current.temperature}°C`,
      `Current temperature ${current.temperature}°C, feels like ${current.feelsLike}°C. ` +
      `Stay hydrated, avoid midday sun, watch for heat-stroke symptoms.`,
      `Current temperature ≥ ${TH.heatMax}°C (extreme-heat band).`,
      severityForTemp(current.temperature),
      now, now + 6 * 3600 * 1000,
    ));
  } else if (current.temperature <= TH.coldMin) {
    alerts.push(makeAlert(
      loc, point, 'extreme_cold',
      `Cold wave — ${loc.name}`,
      `Temperature ${current.temperature}°C`,
      `Current temperature ${current.temperature}°C. Protect crops, livestock, ` +
      `and vulnerable populations. Use multiple layers and shelter heated spaces.`,
      `Current temperature ≤ ${TH.coldMin}°C (cold-wave band).`,
      severityForTemp(current.temperature),
      now, now + 6 * 3600 * 1000,
    ));
  }

  // 5. Cyclone-like conditions — extremely strong sustained winds (>75 km/h)
  const cycloneHours = hourly.filter(h => h.windSpeed >= TH.windGustsSevere);
  if (cycloneHours.length > 0) {
    const maxWind = Math.max(...cycloneHours.map(h => h.windSpeed));
    const start = cycloneHours[0].time;
    const end = cycloneHours[cycloneHours.length - 1].time + 3600 * 1000;
    alerts.push(makeAlert(
      loc, point, 'cyclone',
      `Cyclone-force winds — ${loc.name}`,
      `Sustained winds up to ${maxWind} km/h`,
      `Sustained winds ≥ ${TH.windGustsSevere} km/h forecast. Follow official IMD ` +
      `cyclone advisories, secure property, be ready to evacuate.`,
      `Forecast sustained winds ${maxWind} km/h reach cyclone-force threshold.`,
      'extreme', start, end,
    ));
  }

  // 6. Flood-risk indicator — heavy rainfall + multi-day cumulative
  const totalRain3d = daily.slice(0, 3).reduce((sum, d) => sum + d.precipitation, 0);
  if (totalRain3d >= 100) {
    alerts.push(makeAlert(
      loc, point, 'flood_risk',
      `Flood risk — ${loc.name}`,
      `Cumulative rain ${totalRain3d.toFixed(0)} mm in 3 days`,
      `Forecast 3-day cumulative rainfall ${totalRain3d.toFixed(0)} mm. ` +
      `Riverine and urban flooding possible. Avoid low-lying areas and crossings.`,
      `3-day cumulative precipitation ${totalRain3d.toFixed(0)} mm exceeds flood-risk threshold.`,
      'severe',
      now,
      now + 3 * 24 * 3600 * 1000,
    ));
  }

  // 7. Humidex extreme discomfort — high temp + high humidity
  if (
    current.temperature >= 35 &&
    current.humidity >= 70 &&
    current.feelsLike >= TH.humidexHigh
  ) {
    alerts.push(makeAlert(
      loc, point, 'humidex',
      `Extreme discomfort — ${loc.name}`,
      `Feels like ${current.feelsLike}°C`,
      `High humidity + temperature yields apparent temperature ${current.feelsLike}°C. ` +
      `Limit outdoor activity, drink water frequently, watch for heat exhaustion.`,
      `Apparent temperature ≥ ${TH.humidexHigh}°C (humidex extreme band).`,
      'severe',
      now,
      now + 6 * 3600 * 1000,
    ));
  }

  // Sort by severity desc then earliest start asc
  const rank: Record<Severity, number> = {
    extreme: 4, severe: 3, moderate: 2, minor: 1,
  };
  return alerts.sort((a, b) => {
    if (rank[b.severity] !== rank[a.severity]) return rank[b.severity] - rank[a.severity];
    return a.startsAt - b.startsAt;
  });
}

/** Convenience: derive alerts straight from a daily forecast array (used by map layer). */
export function deriveDailyAlerts(
  loc: ProviderLocation,
  point: GeoPoint,
  daily: RealDailyForecast[],
  currentTempC: number,
  currentHumidity: number,
): RealWeatherAlert[] {
  // Reuse the same logic with a synthesized RealForecast
  const synthFc: RealForecast = {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    lat: point.lat,
    lng: point.lng,
    current: {
      locationId: loc.id,
      locationName: loc.name,
      state: loc.state,
      lat: point.lat,
      lng: point.lng,
      temperature: currentTempC,
      feelsLike: currentTempC, // simplified
      humidity: currentHumidity,
      windSpeed: 0,
      windDirection: 0,
      pressure: 0,
      precipitation: 0,
      precipitationProbability: 0,
      cloudCover: 0,
      visibility: 10000,
      weatherCode: 0,
      condition: 'Unknown',
      observedAt: Date.now(),
      dataSource: 'real',
      providerName: 'Derived',
    },
    hourly: [] as RealHourlyForecast[],
    daily,
    fetchedAt: Date.now(),
    dataSource: 'real',
    providerName: 'Derived',
  };
  return deriveAlerts(loc, point, synthFc);
}
