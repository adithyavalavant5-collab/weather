import {
  HazardType, RiskLevel, CurrentWeather, HazardScore, HourlyForecast,
  WeatherAlert, DataSourceStatus, DataSourceKey, DataStatus,
  FeedbackEntry, StateRiskSummary, RiskThresholds, IndianLocation,
} from './types';

// ============================================================================
// AI-DRIVEN HYPER-LOCAL RISK ENGINE (DEMO SIMULATION)
// In production this would be replaced by ConvLSTM / U-Net / 3D U-Net models
// fed by radar + satellite + AWS + IoT + lightning + rain gauge + terrain data.
// ============================================================================

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  monitor: 40,
  warning: 60,
  highPriority: 80,
  critical: 90,
};

export function riskLevelFromScore(score: number, t: RiskThresholds = DEFAULT_THRESHOLDS): RiskLevel {
  if (score > t.critical) return 'extreme';
  if (score > t.highPriority) return 'very_high';
  if (score > t.warning) return 'high';
  if (score > t.monitor) return 'elevated';
  if (score > 20) return 'moderate';
  return 'low';
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#22c55e';
    case 'moderate': return '#84cc16';
    case 'elevated': return '#eab308';
    case 'high': return '#f97316';
    case 'very_high': return '#ef4444';
    case 'extreme': return '#b91c1c';
  }
}

export function riskBgClass(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'bg-emerald-500';
    case 'moderate': return 'bg-lime-500';
    case 'elevated': return 'bg-yellow-500';
    case 'high': return 'bg-orange-500';
    case 'very_high': return 'bg-red-500';
    case 'extreme': return 'bg-red-700';
  }
}

export function riskTextClass(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'text-emerald-600';
    case 'moderate': return 'text-lime-600';
    case 'elevated': return 'text-yellow-600';
    case 'high': return 'text-orange-600';
    case 'very_high': return 'text-red-600';
    case 'extreme': return 'text-red-700';
  }
}

export const HAZARD_TYPES: HazardType[] = [
  'heavy_rain', 'extreme_rain', 'flash_flood', 'flood', 'cloudburst',
  'thunderstorm', 'lightning', 'hail', 'high_wind', 'squall', 'cyclone',
];

// Simple seedable PRNG for deterministic simulation per location
export class Random {
  private s: number;
  constructor(seed: number) { this.s = seed > 0 ? seed : 1; }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return this.s / 2147483647;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
  int(min: number, max: number): number { return Math.floor(this.range(min, max + 1)); }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

// Hash a location to a numeric seed
export function locationSeed(loc: IndianLocation): number {
  return Math.floor((Math.abs(loc.lat) * 1000 + Math.abs(loc.lng) * 1000)) || 1;
}

// Deterministic-ish seasonal/coastal risk modifiers
function getTerrainProfile(loc: IndianLocation): {
  terrain: 'coastal' | 'plain' | 'hilly' | 'riverine' | 'urban';
  floodProne: boolean;
  cycloneProne: boolean;
  lightningProne: boolean;
} {
  const name = loc.name.toLowerCase();
  const state = loc.state.toLowerCase();
  const isCoastal = ['chennai', 'mumbai', 'kochi', 'mangaluru', 'visakhapatnam', 'puducherry',
    'kolkata', 'bhubaneswar', 'panaji', 'karaikal', 'balasore', 'thiruvananthapuram', 'tuticorin',
    'mumbai city', 'surat', 'bhavnagar', 'kakinada', 'machilipatnam', 'nellore', 'kandla'].includes(name);
  const isHilly = ['darjeeling', 'shillong', 'gangtok', 'dehradun', 'ooty', 'kodaikanal',
    'coonoor', 'munnar', 'manali', 'shimla', 'srinagar', 'tawang'].includes(name);
  const isRiverine = ['patna', 'guwahati', 'varanasi', 'allahabad', 'cuttack', 'silchar',
    'bhubaneswar', 'tezpur'].includes(name);
  const isUrban = ['delhi', 'mumbai', 'bengaluru', 'hyderabad', 'pune', 'chennai',
    'kolkata', 'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur'].includes(name);

  const coastalStates = ['tamil nadu', 'kerala', 'karnataka', 'andhra pradesh', 'odisha',
    'west bengal', 'maharashtra', 'gujarat', 'goa', 'puducherry (ut)'];
  const cycloneProne = ['odisha', 'andhra pradesh', 'tamil nadu', 'west bengal',
    'puducherry (ut)', 'gujarat'].some(s => state.includes(s.split(' ')[0]));
  const lightningProne = ['bihar', 'jharkhand', 'odisha', 'west bengal', 'uttar pradesh',
    'madhya pradesh', 'maharashtra'].some(s => state.includes(s.split(' ')[0]));

  let terrain: 'coastal' | 'plain' | 'hilly' | 'riverine' | 'urban' = 'plain';
  if (isCoastal) terrain = 'coastal';
  else if (isHilly) terrain = 'hilly';
  else if (isRiverine) terrain = 'riverine';
  else if (isUrban) terrain = 'urban';

  return {
    terrain,
    floodProne: isRiverine || isCoastal || terrain === 'coastal',
    cycloneProne,
    lightningProne,
  };
}

// Generate a rolling 6-hour forecast for a location + "scenario time" (epoch ms)
export function generateForecast(
  loc: IndianLocation,
  now: Date,
  rng: Random,
): {
  current: CurrentWeather;
  hazards: HazardScore[];
  hourly: HourlyForecast[];
  overallRisk: number;
  topHazard: HazardType;
  confidence: number;
} {
  const profile = getTerrainProfile(loc);
  const seed = locationSeed(loc);
  const hourOfDay = now.getHours() + now.getMinutes() / 60;

  // Determine base weather condition by terrain & season
  // Indian monsoon months: Jun-Sep
  const month = now.getMonth() + 1; // 1-12
  const isMonsoon = month >= 6 && month <= 9;
  const isPreMonsoon = month >= 3 && month <= 5;
  const isPostMonsoon = month === 10 || month === 11;
  const isWinter = month === 12 || month <= 2;

  // Probability of severe weather pattern (higher in monsoon)
  let severeBase = 30;
  if (isMonsoon) severeBase = 55;
  else if (isPreMonsoon) severeBase = 45;
  else if (isPostMonsoon) severeBase = 35;
  else severeBase = 20;

  // Cyclone-prone coastal in Oct-Nov
  if (profile.cycloneProne && (isPostMonsoon || isMonsoon)) severeBase += 10;
  // Lightning-prone in pre-monsoon afternoon
  if (profile.lightningProne && isPreMonsoon && hourOfDay >= 13 && hourOfDay <= 19) severeBase += 10;

  // Pick a primary hazard scenario from a small pool — keyed by seed and time-bucket
  const timeBucket = Math.floor(now.getTime() / (15 * 60 * 1000)); // 15-min buckets
  const bucketRng = new Random(seed + timeBucket);
  const r = bucketRng.next();

  // Each 15-min bucket has a small chance of escalating risk, otherwise trend follows prior
  // We simulate a "developing storm" scenario across 6 hours
  let peakHour = bucketRng.int(0, 6); // which hour offset peaks
  let peakIntensity = bucketRng.range(severeBase, Math.min(99, severeBase + 50));

  // Pick primary hazard by terrain/season
  let primaryHazard: HazardType = 'thunderstorm';
  if (profile.cycloneProne && isPostMonsoon && r > 0.7) primaryHazard = 'cyclone';
  else if (profile.floodProne && isMonsoon && r > 0.6) primaryHazard = 'flash_flood';
  else if (profile.lightningProne && isPreMonsoon && r > 0.55) primaryHazard = 'lightning';
  else if (isMonsoon && r > 0.75) primaryHazard = 'cloudburst';
  else if (isMonsoon) primaryHazard = 'heavy_rain';
  else if (isPreMonsoon) primaryHazard = bucketRng.pick(['thunderstorm', 'lightning', 'hail', 'squall']);
  else primaryHazard = bucketRng.pick(['normal', 'normal', 'thunderstorm']);

  // Build 6-hour timeline that ramps up to peakHour then ramps down
  const hourly: HourlyForecast[] = [];
  for (let h = 0; h <= 6; h++) {
    const distanceFromPeak = Math.abs(h - peakHour);
    const ramp = Math.max(0, 1 - distanceFromPeak / 4);
    let risk = peakIntensity * ramp;
    // Add some non-monotonic noise
    risk += (bucketRng.next() - 0.5) * 12;
    risk = Math.max(0, Math.min(99, Math.round(risk)));

    let hazard: HazardType = 'normal';
    if (risk > 60) hazard = primaryHazard;
    else if (risk > 35) {
      hazard = primaryHazard === 'lightning' ? 'thunderstorm' :
                primaryHazard === 'flash_flood' ? 'heavy_rain' :
                primaryHazard === 'cloudburst' ? 'extreme_rain' :
                primaryHazard === 'cyclone' ? 'high_wind' :
                primaryHazard;
    } else if (risk > 15) {
      hazard = 'heavy_rain';
    }

    const time = new Date(now.getTime() + h * 3600 * 1000);
    const timeLabel = formatTimeLabel(time);
    const level = riskLevelFromScore(risk);

    const action = recommendedActionFor(hazard, level);

    hourly.push({
      hourOffset: h,
      timeLabel,
      isoTime: time.toISOString(),
      hazard,
      probability: Math.min(99, Math.round(risk + bucketRng.range(-5, 5))),
      severity: Math.min(99, Math.round(risk * 0.9 + 5)),
      confidence: Math.round(60 + (1 - distanceFromPeak / 6) * 35 + bucketRng.range(-5, 5)),
      risk,
      riskLevel: level,
      expectedStart: h === 0 ? 'In progress' : `${formatTimeLabel(new Date(time.getTime() - 30 * 60 * 1000))} – ${timeLabel}`,
      duration: h === peakHour ? '60-90 min' : '30-45 min',
      expectedConditions: describeConditions(hazard, level),
      recommendedAction: action,
    });
  }

  // Now/hour0 drives current weather
  const nowH = hourly[0];

  // Derive current weather from now forecast
  const baseTemp = profile.terrain === 'hilly' ? 22 : profile.terrain === 'coastal' ? 30 : 28;
  const tempOffset = (month === 12 || month <= 2) ? -5 : (isMonsoon ? -3 : (isPreMonsoon ? 5 : 0));
  const diurnal = Math.sin((hourOfDay - 9) / 24 * 2 * Math.PI) * 5;
  const temperature = Math.round(baseTemp + tempOffset + diurnal + (nowH.hazard !== 'normal' ? -3 : 0));

  const rainfall = nowH.hazard.includes('rain') || nowH.hazard === 'cloudburst'
    ? (nowH.hazard === 'cloudburst' ? bucketRng.range(80, 200) :
       nowH.hazard === 'extreme_rain' ? bucketRng.range(40, 80) :
       bucketRng.range(5, 30))
    : (nowH.hazard === 'thunderstorm' ? bucketRng.range(1, 8) : 0);

  const humidity = Math.min(99, 50 + (nowH.risk * 0.4) + (isMonsoon ? 15 : 0) + (profile.terrain === 'coastal' ? 10 : 0));
  const windSpeed = nowH.hazard === 'high_wind' || nowH.hazard === 'cyclone'
    ? bucketRng.range(50, 120)
    : nowH.hazard === 'squall'
      ? bucketRng.range(40, 80)
      : bucketRng.range(5, 25);
  const windDirection = bucketRng.pick([45, 90, 135, 180, 225, 270, 315]);
  const pressure = Math.round(1000 + (profile.terrain === 'hilly' ? -20 : 0) - (nowH.risk > 60 ? 8 : 0));
  const visibility = nowH.hazard === 'cloudburst' ? 0.5 :
                     nowH.hazard === 'extreme_rain' ? 1 :
                     nowH.hazard === 'heavy_rain' ? 2 :
                     nowH.hazard === 'thunderstorm' ? 4 :
                     10 + bucketRng.range(-2, 2);
  const cloudCover = Math.min(100, 30 + nowH.risk * 0.7 + (isMonsoon ? 20 : 0));

  const current: CurrentWeather = {
    temperature,
    rainfall: Math.round(rainfall * 10) / 10,
    rainfallIntensity: Math.round(rainfall * 10) / 10,
    humidity: Math.round(humidity),
    windSpeed: Math.round(windSpeed),
    windDirection,
    pressure,
    visibility: Math.round(visibility * 10) / 10,
    cloudCover: Math.round(cloudCover),
    feelsLike: Math.round(temperature + (humidity > 70 ? 3 : 0) - (windSpeed > 30 ? 2 : 0)),
    condition: describeConditions(nowH.hazard, nowH.riskLevel),
    updatedAt: now.getTime(),
  };

  // Hazard-specific scores
  const hazards: HazardScore[] = HAZARD_TYPES.map(hz => {
    let baseP = 5;
    if (hz === primaryHazard) baseP = nowH.probability;
    else if (hz === 'heavy_rain' && primaryHazard === 'cloudburst') baseP = nowH.probability * 0.85;
    else if (hz === 'extreme_rain' && primaryHazard === 'cloudburst') baseP = nowH.probability * 0.7;
    else if (hz === 'flood' && (primaryHazard === 'flash_flood' || primaryHazard === 'cloudburst')) baseP = nowH.probability * 0.75;
    else if (hz === 'flash_flood' && profile.floodProne && nowH.probability > 50) baseP = nowH.probability * 0.6;
    else if (hz === 'lightning' && primaryHazard === 'thunderstorm') baseP = nowH.probability * 0.55;
    else if (hz === 'high_wind' && primaryHazard === 'cyclone') baseP = nowH.probability * 0.85;
    else if (hz === 'squall' && primaryHazard === 'thunderstorm' && isPreMonsoon) baseP = nowH.probability * 0.4;
    else if (hz === 'hail' && isPreMonsoon && primaryHazard === 'thunderstorm') baseP = nowH.probability * 0.3;
    else if (hz === 'cyclone' && !profile.cycloneProne) baseP = 2;
    else if (hz === 'cloudburst' && profile.terrain !== 'hilly') baseP = nowH.probability * 0.2;

    baseP += (bucketRng.next() - 0.5) * 10;
    baseP = Math.max(0, Math.min(99, Math.round(baseP)));

    return {
      hazard: hz,
      probability: baseP,
      severity: Math.min(99, Math.round(baseP * 0.9 + 10)),
      confidence: Math.round(50 + baseP * 0.4),
      risk: baseP,
    };
  });

  // Sort hazards by probability desc, take top 6 for display
  hazards.sort((a, b) => b.probability - a.probability);

  const overallRisk = Math.max(...hourly.map(h => h.risk));
  const topHazard = primaryHazard;
  const peakConfidence = hourly[peakHour]?.confidence ?? 75;

  return {
    current,
    hazards: hazards.slice(0, 6),
    hourly,
    overallRisk,
    topHazard,
    confidence: peakConfidence,
  };
}

function formatTimeLabel(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function describeConditions(hazard: HazardType, level: RiskLevel): string {
  const levelStr = level.toUpperCase();
  switch (hazard) {
    case 'normal': return `Clear to partly cloudy — ${levelStr}`;
    case 'heavy_rain': return `Heavy rainfall — ${levelStr}`;
    case 'extreme_rain': return `Extreme rainfall expected — ${levelStr}`;
    case 'flash_flood': return `Flash flood risk — ${levelStr}`;
    case 'flood': return `Riverine flood risk — ${levelStr}`;
    case 'cloudburst': return `Cloudburst scenario — ${levelStr}`;
    case 'thunderstorm': return `Thunderstorm with rain — ${levelStr}`;
    case 'lightning': return `Severe lightning activity — ${levelStr}`;
    case 'hail': return `Hailstorm possible — ${levelStr}`;
    case 'high_wind': return `Damaging winds — ${levelStr}`;
    case 'squall': return `Squall approaching — ${levelStr}`;
    case 'cyclone': return `Cyclonic conditions — ${levelStr}`;
  }
}

function recommendedActionFor(hazard: HazardType, level: RiskLevel): string {
  if (level === 'low' || hazard === 'normal') return 'No action needed — monitor updates';
  switch (hazard) {
    case 'lightning':
      return 'Stay indoors. Avoid open fields, isolated trees, electrical appliances, and metal objects.';
    case 'thunderstorm':
      return 'Seek shelter in a sturdy building. Avoid travel and stay away from windows.';
    case 'heavy_rain':
    case 'extreme_rain':
      return 'Avoid low-lying areas. Do not drive through waterlogged roads. Stay informed.';
    case 'flash_flood':
    case 'flood':
      return 'Move to higher ground immediately. Do not cross flowing water. Follow evacuation orders.';
    case 'cloudburst':
      return 'Evacuate vulnerable slopes and low-lying zones immediately. Seek higher ground.';
    case 'hail':
      return 'Protect vehicles and crops. Stay indoors. Avoid open spaces.';
    case 'high_wind':
    case 'squall':
      return 'Secure loose objects. Stay away from trees and hoardings. Avoid travel.';
    case 'cyclone':
      return 'Follow cyclone warnings. Secure property. Be ready to evacuate to cyclone shelters.';
    default:
      return 'Monitor local updates and follow authority instructions.';
  }
}

// Generate data source status (with simulated liveness)
export function generateDataSourceStatuses(now: number): Record<DataSourceKey, DataSourceStatus> {
  const mk = (key: DataSourceKey, label: string, secondsAgo: number, freq: string, forceStatus?: DataStatus): DataSourceStatus => {
    let status: DataStatus = forceStatus || 'LIVE';
    if (!forceStatus) {
      if (secondsAgo < 30) status = 'LIVE';
      else if (secondsAgo < 120) status = 'RECENT';
      else if (secondsAgo < 600) status = 'DELAYED';
      else if (secondsAgo < 3600) status = 'STALE';
      else status = 'OFFLINE';
    }
    return {
      key, label, status,
      lastUpdated: now - secondsAgo * 1000,
      lastUpdatedLabel: `${secondsAgo}s ago`,
      updateFrequency: freq,
    };
  };
  return {
    gps: mk('gps', 'GPS', 5, 'On movement'),
    time: mk('time', 'Time', 1, 'Continuous (NTP)'),
    weather: mk('weather', 'Weather', 20, '1 min (AWS)'),
    radar: mk('radar', 'Radar', 20, '10 min scan'),
    satellite: mk('satellite', 'Satellite', 240, '15-30 min'),
    aws: mk('aws', 'AWS', 35, '1 min'),
    iot: mk('iot', 'IoT', 12, '30 sec'),
    lightning: mk('lightning', 'Lightning', 10, 'Real-time'),
    rain_gauge: mk('rain_gauge', 'Rain Gauge', 45, '1 min'),
    forecast_model: mk('forecast_model', 'Forecast Model', 60, 'On new data'),
    ai_model: mk('ai_model', 'AI Model', 30, 'On new data'),
    alert_engine: mk('alert_engine', 'Alert Engine', 5, 'Continuous'),
  };
}

// Generate state-wise risk summaries for the admin dashboard
export function generateStateRiskSummaries(now: number): StateRiskSummary[] {
  const stateData = [
    { code: 'TN', name: 'Tamil Nadu', districts: 38, pop: 77000000, coastal: true },
    { code: 'KA', name: 'Karnataka', districts: 31, pop: 68000000, coastal: true },
    { code: 'KL', name: 'Kerala', districts: 14, pop: 35000000, coastal: true },
    { code: 'AP', name: 'Andhra Pradesh', districts: 26, pop: 53000000, coastal: true },
    { code: 'TS', name: 'Telangana', districts: 33, pop: 39000000, coastal: false },
    { code: 'MH', name: 'Maharashtra', districts: 36, pop: 125000000, coastal: true },
    { code: 'DL', name: 'Delhi (NCT)', districts: 11, pop: 20000000, coastal: false },
    { code: 'UP', name: 'Uttar Pradesh', districts: 75, pop: 240000000, coastal: false },
    { code: 'WB', name: 'West Bengal', districts: 23, pop: 99000000, coastal: true },
    { code: 'GJ', name: 'Gujarat', districts: 33, pop: 64000000, coastal: true },
    { code: 'RJ', name: 'Rajasthan', districts: 50, pop: 80000000, coastal: false },
    { code: 'PB', name: 'Punjab', districts: 23, pop: 30000000, coastal: false },
    { code: 'HR', name: 'Haryana', districts: 22, pop: 29000000, coastal: false },
    { code: 'BR', name: 'Bihar', districts: 38, pop: 130000000, coastal: false, riverine: true },
    { code: 'OD', name: 'Odisha', districts: 30, pop: 46000000, coastal: true },
    { code: 'AS', name: 'Assam', districts: 35, pop: 35000000, coastal: false, riverine: true },
    { code: 'PY', name: 'Puducherry (UT)', districts: 4, pop: 1600000, coastal: true },
    { code: 'GA', name: 'Goa', districts: 2, pop: 1600000, coastal: true },
    { code: 'JK', name: 'Jammu & Kashmir (UT)', districts: 20, pop: 13000000, coastal: false, hilly: true },
    { code: 'CH', name: 'Chandigarh (UT)', districts: 1, pop: 1200000, coastal: false },
  ];

  const rng = new Random(Math.floor(now / (10 * 60 * 1000))); // 10-min buckets
  return stateData.map(s => {
    const baseRisk = s.coastal ? 55 : s.riverine ? 50 : 30;
    const risk = Math.max(5, Math.min(98, Math.round(baseRisk + (rng.next() - 0.3) * 50)));
    const level = riskLevelFromScore(risk);
    const topHazard: HazardType = s.coastal ? (rng.next() > 0.6 ? 'cyclone' : 'heavy_rain') :
                                   s.riverine ? 'flash_flood' :
                                   s.hilly ? 'cloudburst' :
                                   rng.pick(['thunderstorm', 'lightning', 'heavy_rain']);
    const affectedDistricts = Math.max(1, Math.round(s.districts * risk / 100));
    const popAtRisk = Math.round(s.pop * risk / 100 / 1000) * 1000;
    const activeAlerts = risk > 60 ? rng.int(1, 5) : risk > 30 ? rng.int(0, 2) : 0;
    return {
      state: s.name,
      stateCode: s.code,
      overallRisk: risk,
      riskLevel: level,
      topHazard,
      affectedDistricts,
      totalDistricts: s.districts,
      populationAtRisk: popAtRisk,
      activeAlerts,
    };
  }).sort((a, b) => b.overallRisk - a.overallRisk);
}

// Generate fake feedback entries (continuous learning)
export function generateFeedbackEntries(now: number): FeedbackEntry[] {
  const rng = new Random(Math.floor(now / (60 * 60 * 1000))); // hourly bucket
  const entries: FeedbackEntry[] = [];
  for (let i = 0; i < 12; i++) {
    const ts = now - i * 3600 * 1000 - rng.int(0, 30) * 60 * 1000;
    const hazards: HazardType[] = ['lightning', 'thunderstorm', 'heavy_rain', 'flash_flood', 'cloudburst', 'hail'];
    const predictedHazard = rng.pick(hazards);
    const actualMatch = rng.next() > 0.15;
    const accuracy = actualMatch ? rng.int(78, 96) : rng.int(20, 45);
    const falseAlarm = !actualMatch && rng.next() > 0.5;
    const missedEvent = !actualMatch && !falseAlarm;
    entries.push({
      id: `fb-${i}-${ts}`,
      predictedHazard,
      predictedTime: new Date(ts).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
      actualEvent: actualMatch ? predictedHazard : (falseAlarm ? 'No event' : rng.pick(['lightning', 'heavy_rain', 'thunderstorm'])),
      accuracy,
      falseAlarm,
      missedEvent,
      timestamp: ts,
    });
  }
  return entries;
}

// Format "X sec/min/hr ago"
export function timeAgoLabel(timestamp: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Format current local time label
export function formatClock(d: Date, withSeconds = false): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return withSeconds
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`
    : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Generate a sample alert
export function buildAlert(
  loc: IndianLocation,
  hazard: HazardType,
  risk: number,
  confidence: number,
  issuedAt: number,
): WeatherAlert {
  const level = riskLevelFromScore(risk);
  return {
    id: `alert-${loc.id}-${issuedAt}`,
    locationName: `${loc.name}, ${loc.state}`,
    hazard,
    severity: level,
    probability: risk,
    confidence,
    expectedWithin: level === 'extreme' ? 'Within 1 hour' :
                    level === 'very_high' ? 'Within 1-2 hours' :
                    level === 'high' ? 'Within 2-3 hours' : 'Within 3-6 hours',
    issuedAt,
    expiresAt: issuedAt + 6 * 3600 * 1000,
    channels: ['app', 'sms', 'ivr', 'siren', 'push', 'authority_dashboard'],
    audience: 'all',
    messageKey: `alert_${hazard}`,
  };
}
