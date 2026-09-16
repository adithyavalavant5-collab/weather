// Core types for the AI-Driven Hyper-Local Early Warning System

export type LanguageCode =
  | 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or';

export type HazardType =
  | 'heavy_rain'
  | 'extreme_rain'
  | 'flash_flood'
  | 'flood'
  | 'cloudburst'
  | 'thunderstorm'
  | 'lightning'
  | 'hail'
  | 'high_wind'
  | 'squall'
  | 'cyclone'
  | 'normal';

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'very_high' | 'extreme';

export type DataMode = 'LIVE' | 'DEMO';

export type DataStatus = 'LIVE' | 'RECENT' | 'DELAYED' | 'STALE' | 'OFFLINE';

export type DataSourceKey =
  | 'gps' | 'time' | 'weather' | 'radar' | 'satellite'
  | 'aws' | 'iot' | 'lightning' | 'rain_gauge'
  | 'forecast_model' | 'alert_engine' | 'ai_model';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface IndianLocation {
  id: string;
  name: string;
  state: string;
  district: string;
  type: 'city' | 'town' | 'village' | 'district_hq' | 'state_capital';
  lat: number;
  lng: number;
  population?: number;
}

export interface CurrentWeather {
  temperature: number; // °C
  rainfall: number; // mm/hr
  rainfallIntensity: number; // mm/hr
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // degrees
  pressure: number; // hPa
  visibility: number; // km
  cloudCover: number; // %
  feelsLike: number; // °C
  condition: string;
  updatedAt: number; // epoch ms
}

export interface HazardScore {
  hazard: HazardType;
  probability: number; // 0-100
  severity: number; // 0-100
  confidence: number; // 0-100
  risk: number; // 0-100
}

export interface HourlyForecast {
  hourOffset: number; // 0..6
  timeLabel: string; // "3:35 PM"
  isoTime: string;
  hazard: HazardType;
  probability: number; // 0-100
  severity: number; // 0-100
  confidence: number; // 0-100
  risk: number; // 0-100
  riskLevel: RiskLevel;
  expectedStart: string;
  duration: string;
  expectedConditions: string;
  recommendedAction: string;
}

export interface WeatherAlert {
  id: string;
  locationName: string;
  hazard: HazardType;
  severity: RiskLevel;
  probability: number;
  confidence: number;
  expectedWithin: string;
  issuedAt: number;
  expiresAt: number;
  channels: AlertChannel[];
  audience: 'citizens' | 'farmers' | 'authorities' | 'all';
  messageKey: string;
}

export type AlertChannel = 'app' | 'sms' | 'ivr' | 'siren' | 'push' | 'iot' | 'authority_dashboard';

export interface DataSourceStatus {
  key: DataSourceKey;
  label: string;
  status: DataStatus;
  lastUpdated: number; // epoch ms
  lastUpdatedLabel: string;
  updateFrequency: string;
}

export interface SystemStatus {
  gps: DataStatus;
  time: DataStatus;
  weather: DataStatus;
  radar: DataStatus;
  lightning: DataStatus;
  ai_model: DataStatus;
  alert_engine: DataStatus;
}

export interface RiskRecalculationStep {
  step: string;
  status: 'pending' | 'running' | 'done';
  timestamp: number;
}

export interface FeedbackEntry {
  id: string;
  predictedHazard: HazardType;
  predictedTime: string;
  actualEvent: string;
  accuracy: number;
  falseAlarm: boolean;
  missedEvent: boolean;
  timestamp: number;
}

export interface StateRiskSummary {
  state: string;
  stateCode: string;
  overallRisk: number;
  riskLevel: RiskLevel;
  topHazard: HazardType;
  affectedDistricts: number;
  totalDistricts: number;
  populationAtRisk: number;
  activeAlerts: number;
}

export interface RiskThresholds {
  monitor: number; // 40
  warning: number; // 60
  highPriority: number; // 80
  critical: number; // 90
}
