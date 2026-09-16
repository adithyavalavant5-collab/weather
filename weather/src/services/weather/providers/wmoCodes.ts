// ============================================================================
// WMO Weather Code Decoder — shared by Open-Meteo and OpenWeatherMap.
// Maps integer WMO codes (0..499) to human-readable labels + emojis.
// Source: https://open-meteo.com/en/docs (WMO weather interpretation codes)
// ============================================================================

export interface WmoCodeInfo {
  code: number;
  label: string;
  emoji: string;
  /** True if the condition is hazardous (rain, snow, storm, etc). */
  hazardous: boolean;
}

// Lookup table covering all standard WMO codes
const WMO_TABLE: Record<number, WmoCodeInfo> = {
  0: { code: 0, label: 'Clear sky', emoji: '☀️', hazardous: false },
  1: { code: 1, label: 'Mainly clear', emoji: '🌤️', hazardous: false },
  2: { code: 2, label: 'Partly cloudy', emoji: '⛅', hazardous: false },
  3: { code: 3, label: 'Overcast', emoji: '☁️', hazardous: false },
  45: { code: 45, label: 'Fog', emoji: '🌫️', hazardous: true },
  48: { code: 48, label: 'Depositing rime fog', emoji: '🌫️', hazardous: true },
  51: { code: 51, label: 'Light drizzle', emoji: '🌦️', hazardous: false },
  53: { code: 53, label: 'Moderate drizzle', emoji: '🌦️', hazardous: false },
  55: { code: 55, label: 'Dense drizzle', emoji: '🌧️', hazardous: true },
  56: { code: 56, label: 'Light freezing drizzle', emoji: '🌧️', hazardous: true },
  57: { code: 57, label: 'Dense freezing drizzle', emoji: '🌧️', hazardous: true },
  61: { code: 61, label: 'Slight rain', emoji: '🌦️', hazardous: false },
  63: { code: 63, label: 'Moderate rain', emoji: '🌧️', hazardous: true },
  65: { code: 65, label: 'Heavy rain', emoji: '🌧️', hazardous: true },
  66: { code: 66, label: 'Light freezing rain', emoji: '🌧️', hazardous: true },
  67: { code: 67, label: 'Heavy freezing rain', emoji: '🌧️', hazardous: true },
  71: { code: 71, label: 'Slight snowfall', emoji: '🌨️', hazardous: false },
  73: { code: 73, label: 'Moderate snowfall', emoji: '🌨️', hazardous: true },
  75: { code: 75, label: 'Heavy snowfall', emoji: '❄️', hazardous: true },
  77: { code: 77, label: 'Snow grains', emoji: '🌨️', hazardous: false },
  80: { code: 80, label: 'Slight rain showers', emoji: '🌦️', hazardous: false },
  81: { code: 81, label: 'Moderate rain showers', emoji: '🌧️', hazardous: true },
  82: { code: 82, label: 'Violent rain showers', emoji: '⛈️', hazardous: true },
  85: { code: 85, label: 'Slight snow showers', emoji: '🌨️', hazardous: false },
  86: { code: 86, label: 'Heavy snow showers', emoji: '❄️', hazardous: true },
  95: { code: 95, label: 'Thunderstorm', emoji: '⛈️', hazardous: true },
  96: { code: 96, label: 'Thunderstorm with slight hail', emoji: '⛈️', hazardous: true },
  99: { code: 99, label: 'Thunderstorm with heavy hail', emoji: '⛈️', hazardous: true },
};

const FALLBACK: WmoCodeInfo = {
  code: -1,
  label: 'Unknown',
  emoji: '❔',
  hazardous: false,
};

export function decodeWmo(code: number | null | undefined): WmoCodeInfo {
  if (code == null) return FALLBACK;
  return WMO_TABLE[code] ?? FALLBACK;
}

/** Compass direction (16-point) from degrees. */
export function degreesToCompass(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round((deg % 360) / 22.5) % 16;
  return directions[idx];
}
