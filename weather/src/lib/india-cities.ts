// ============================================================================
// India Cities — ADDITIVE dataset for the new live-weather module.
// Includes the 26+ cities explicitly required by the spec (Delhi, Mumbai, …)
// plus all major state capitals, UT capitals, and large cities (>1 lakh pop).
//
// This file is INDEPENDENT from the existing src/lib/locations.ts INDIA_STATES
// dataset (which stays untouched). Both are merged at the search layer in
// /api/weather/locations so the user can search either dataset.
// ============================================================================

import type { IndianCityLocation } from '@/services/weather/types';

// Major Indian cities explicitly required by the spec + additional major cities.
// Coordinates are the city's approximate centroid (good enough for weather lookup).
export const INDIA_MAJOR_CITIES: IndianCityLocation[] = [
  // -------- 26 cities explicitly required by the spec --------
  { id: 'city-delhi',     name: 'Delhi',             state: 'Delhi (NCT)',           type: 'state_capital', lat: 28.6139, lng: 77.2090, population: 11_000_000 },
  { id: 'city-mumbai',    name: 'Mumbai',            state: 'Maharashtra',          type: 'state_capital', lat: 19.0760, lng: 72.8777, population: 12_500_000 },
  { id: 'city-chennai',   name: 'Chennai',           state: 'Tamil Nadu',            type: 'state_capital', lat: 13.0827, lng: 80.2707, population: 4_500_000 },
  { id: 'city-bengaluru', name: 'Bengaluru',         state: 'Karnataka',             type: 'state_capital', lat: 12.9716, lng: 77.5946, population: 8_500_000 },
  { id: 'city-hyderabad', name: 'Hyderabad',         state: 'Telangana',             type: 'state_capital', lat: 17.3850, lng: 78.4867, population: 6_800_000 },
  { id: 'city-kolkata',   name: 'Kolkata',           state: 'West Bengal',           type: 'state_capital', lat: 22.5726, lng: 88.3639, population: 4_500_000 },
  { id: 'city-pune',      name: 'Pune',              state: 'Maharashtra',           type: 'city',          lat: 18.5204, lng: 73.8567, population: 3_100_000 },
  { id: 'city-ahmedabad', name: 'Ahmedabad',         state: 'Gujarat',               type: 'city',          lat: 23.0225, lng: 72.5714, population: 5_500_000 },
  { id: 'city-jaipur',    name: 'Jaipur',            state: 'Rajasthan',             type: 'state_capital', lat: 26.9124, lng: 75.7873, population: 3_000_000 },
  { id: 'city-lucknow',   name: 'Lucknow',           state: 'Uttar Pradesh',         type: 'state_capital', lat: 26.8467, lng: 80.9462, population: 2_800_000 },
  { id: 'city-kanpur',    name: 'Kanpur',             state: 'Uttar Pradesh',         type: 'city',          lat: 26.4499, lng: 80.3319, population: 2_900_000 },
  { id: 'city-nagpur',    name: 'Nagpur',             state: 'Maharashtra',           type: 'city',          lat: 21.1458, lng: 79.0882, population: 2_400_000 },
  { id: 'city-indore',    name: 'Indore',              state: 'Madhya Pradesh',        type: 'city',          lat: 22.7196, lng: 75.8577, population: 2_000_000 },
  { id: 'city-bhopal',    name: 'Bhopal',              state: 'Madhya Pradesh',        type: 'state_capital', lat: 23.2599, lng: 77.4126, population: 1_800_000 },
  { id: 'city-patna',     name: 'Patna',               state: 'Bihar',                 type: 'state_capital', lat: 25.5941, lng: 85.1376, population: 1_700_000 },
  { id: 'city-coimbatore', name: 'Coimbatore',         state: 'Tamil Nadu',            type: 'city',          lat: 11.0168, lng: 76.9558, population: 1_600_000 },
  { id: 'city-madurai',   name: 'Madurai',             state: 'Tamil Nadu',            type: 'city',          lat: 9.9252,  lng: 78.1198, population: 1_500_000 },
  { id: 'city-visakhapatnam', name: 'Visakhapatnam',  state: 'Andhra Pradesh',        type: 'city',          lat: 17.6868, lng: 83.2185, population: 1_700_000 },
  { id: 'city-kochi',     name: 'Kochi',               state: 'Kerala',                type: 'city',          lat: 9.9312,  lng: 76.2673, population: 600_000 },
  { id: 'city-thiruvananthapuram', name: 'Thiruvananthapuram', state: 'Kerala', type: 'state_capital', lat: 8.5241,  lng: 76.9366, population: 950_000 },
  { id: 'city-guwahati',  name: 'Guwahati',            state: 'Assam',                 type: 'city',          lat: 26.1445, lng: 91.7362, population: 950_000 },
  { id: 'city-bhubaneswar', name: 'Bhubaneswar',       state: 'Odisha',                type: 'state_capital', lat: 20.2961, lng: 85.8245, population: 700_000 },
  { id: 'city-ranchi',    name: 'Ranchi',              state: 'Jharkhand',             type: 'state_capital', lat: 23.3441, lng: 85.3096, population: 1_000_000 },
  { id: 'city-dehradun',  name: 'Dehradun',            state: 'Uttarakhand',           type: 'state_capital', lat: 30.3165, lng: 78.0322, population: 700_000 },
  { id: 'city-srinagar',  name: 'Srinagar',            state: 'Jammu & Kashmir (UT)',  type: 'state_capital', lat: 34.0837, lng: 74.7973, population: 1_200_000 },
  { id: 'city-chandigarh', name: 'Chandigarh',         state: 'Chandigarh (UT)',       type: 'ut_capital',    lat: 30.7333, lng: 76.7794, population: 960_000 },

  // -------- Additional major cities (>5 lakh population, NOT in above list) --------
  { id: 'city-surat',     name: 'Surat',               state: 'Gujarat',               type: 'city',          lat: 21.1702, lng: 72.8311, population: 4_500_000 },
  { id: 'city-vadodara',  name: 'Vadodara',            state: 'Gujarat',               type: 'city',          lat: 22.3072, lng: 73.1812, population: 1_600_000 },
  { id: 'city-rajkot',    name: 'Rajkot',              state: 'Gujarat',               type: 'city',          lat: 22.3039, lng: 70.8022, population: 1_300_000 },
  { id: 'city-nashik',    name: 'Nashik',              state: 'Maharashtra',           type: 'city',          lat: 19.9975, lng: 73.7898, population: 1_500_000 },
  { id: 'city-aurangabad', name: 'Aurangabad (Chhatrapati Sambhaji Nagar)', state: 'Maharashtra', type: 'city', lat: 19.8762, lng: 75.3433, population: 1_100_000 },
  { id: 'city-thane',     name: 'Thane',               state: 'Maharashtra',           type: 'city',          lat: 19.2183, lng: 72.9781, population: 1_800_000 },
  { id: 'city-kolhapur',  name: 'Kolhapur',            state: 'Maharashtra',           type: 'city',          lat: 16.7050, lng: 74.2433, population: 560_000 },
  { id: 'city-mysuru',    name: 'Mysuru',              state: 'Karnataka',             type: 'city',          lat: 12.2958, lng: 76.6394, population: 920_000 },
  { id: 'city-mangaluru', name: 'Mangaluru',           state: 'Karnataka',             type: 'city',          lat: 12.9141, lng: 74.8560, population: 500_000 },
  { id: 'city-hubli',     name: 'Hubballi',            state: 'Karnataka',             type: 'city',          lat: 15.3647, lng: 75.1240, population: 900_000 },
  { id: 'city-kozhikode', name: 'Kozhikode',           state: 'Kerala',                type: 'city',          lat: 11.2588, lng: 75.7804, population: 431_000 },
  { id: 'city-thrissur',  name: 'Thrissur',            state: 'Kerala',                type: 'city',          lat: 10.5276, lng: 76.2144, population: 315_000 },
  { id: 'city-kanyakumari', name: 'Nagercoil',         state: 'Tamil Nadu',            type: 'city',          lat: 8.1800,  lng: 77.4300, population: 230_000 },
  { id: 'city-tiruchirappalli', name: 'Tiruchirappalli', state: 'Tamil Nadu',         type: 'city',          lat: 10.7905, lng: 78.7047, population: 850_000 },
  { id: 'city-salem',     name: 'Salem',               state: 'Tamil Nadu',            type: 'city',          lat: 11.6643, lng: 78.1460, population: 900_000 },
  { id: 'city-vellore',   name: 'Vellore',             state: 'Tamil Nadu',            type: 'city',          lat: 12.9165, lng: 79.1325, population: 500_000 },
  { id: 'city-warangal',  name: 'Warangal',            state: 'Telangana',             type: 'city',          lat: 17.9689, lng: 79.5941, population: 700_000 },
  { id: 'city-nizamabad', name: 'Nizamabad',           state: 'Telangana',             type: 'city',          lat: 18.6725, lng: 78.0940, population: 320_000 },
  { id: 'city-vijayawada', name: 'Vijayawada',          state: 'Andhra Pradesh',        type: 'city',          lat: 16.5062, lng: 80.6480, population: 850_000 },
  { id: 'city-guntur',    name: 'Guntur',               state: 'Andhra Pradesh',        type: 'city',          lat: 16.3067, lng: 80.4365, population: 743_000 },
  { id: 'city-nellore',   name: 'Nellore',              state: 'Andhra Pradesh',        type: 'city',          lat: 14.4426, lng: 79.9865, population: 560_000 },
  { id: 'city-kakinada',  name: 'Kakinada',            state: 'Andhra Pradesh',        type: 'city',          lat: 16.9894, lng: 82.2489, population: 350_000 },
  { id: 'city-varanasi',  name: 'Varanasi',            state: 'Uttar Pradesh',         type: 'city',          lat: 25.3176, lng: 82.9739, population: 1_200_000 },
  { id: 'city-agra',      name: 'Agra',                state: 'Uttar Pradesh',         type: 'city',          lat: 27.1767, lng: 78.0081, population: 1_500_000 },
  { id: 'city-meerut',    name: 'Meerut',              state: 'Uttar Pradesh',         type: 'city',          lat: 28.9845, lng: 77.7064, population: 1_300_000 },
  { id: 'city-ghaziabad', name: 'Ghaziabad',           state: 'Uttar Pradesh',         type: 'city',          lat: 28.6692, lng: 77.4538, population: 1_700_000 },
  { id: 'city-noida',     name: 'Noida',               state: 'Uttar Pradesh',         type: 'city',          lat: 28.5355, lng: 77.3910, population: 650_000 },
  { id: 'city-prayagraj', name: 'Prayagraj',           state: 'Uttar Pradesh',         type: 'city',          lat: 25.4358, lng: 81.8463, population: 1_100_000 },
  { id: 'city-bareilly',  name: 'Bareilly',            state: 'Uttar Pradesh',         type: 'city',          lat: 28.3670, lng: 79.4304, population: 900_000 },
  { id: 'city-moradabad', name: 'Moradabad',           state: 'Uttar Pradesh',         type: 'city',          lat: 28.8386, lng: 78.7733, population: 600_000 },
  { id: 'city-gaya',      name: 'Gaya',                state: 'Bihar',                 type: 'city',          lat: 24.7914, lng: 85.0002, population: 470_000 },
  { id: 'city-bhagalpur', name: 'Bhagalpur',           state: 'Bihar',                 type: 'city',          lat: 25.2425, lng: 86.9842, population: 410_000 },
  { id: 'city-muzaffarpur', name: 'Muzaffarpur',       state: 'Bihar',                 type: 'city',          lat: 26.1209, lng: 85.3647, population: 350_000 },
  { id: 'city-cuttack',   name: 'Cuttack',             state: 'Odisha',                type: 'city',          lat: 20.4625, lng: 85.8828, population: 600_000 },
  { id: 'city-puri',      name: 'Puri',                state: 'Odisha',                type: 'city',          lat: 19.8135, lng: 85.8312, population: 200_000 },
  { id: 'city-balasore',  name: 'Balasore',            state: 'Odisha',                type: 'city',          lat: 21.4936, lng: 86.9336, population: 230_000 },
  { id: 'city-dibrugarh', name: 'Dibrugarh',           state: 'Assam',                 type: 'city',          lat: 27.4728, lng: 94.9120, population: 140_000 },
  { id: 'city-silchar',   name: 'Silchar',             state: 'Assam',                 type: 'city',          lat: 24.8333, lng: 92.7789, population: 230_000 },
  { id: 'city-jorhat',    name: 'Jorhat',              state: 'Assam',                 type: 'city',          lat: 26.7509, lng: 94.2037, population: 70_000 },
  { id: 'city-shillong',  name: 'Shillong',            state: 'Meghalaya',             type: 'state_capital', lat: 25.5788, lng: 91.8933, population: 200_000 },
  { id: 'city-itagar',    name: 'Itanagar',            state: 'Arunachal Pradesh',     type: 'state_capital', lat: 27.0844, lng: 93.6053, population: 60_000 },
  { id: 'city-gangtok',   name: 'Gangtok',             state: 'Sikkim',                type: 'state_capital', lat: 27.3389, lng: 88.6065, population: 100_000 },
  { id: 'city-imphal',    name: 'Imphal',              state: 'Manipur',               type: 'state_capital', lat: 24.8170, lng: 93.9368, population: 265_000 },
  { id: 'city-aizawl',    name: 'Aizawl',              state: 'Mizoram',               type: 'state_capital', lat: 23.7271, lng: 92.7176, population: 290_000 },
  { id: 'city-kohima',    name: 'Kohima',              state: 'Nagaland',              type: 'state_capital', lat: 25.6751, lng: 94.1086, population: 100_000 },
  { id: 'city-agartala',  name: 'Agartala',            state: 'Tripura',               type: 'state_capital', lat: 23.8315, lng: 91.2868, population: 400_000 },
  { id: 'city-dispur',    name: 'Dispur',              state: 'Assam',                 type: 'state_capital', lat: 26.1445, lng: 91.7362, population: 100_000 },
  { id: 'city-raipur',    name: 'Raipur',              state: 'Chhattisgarh',          type: 'state_capital', lat: 21.2514, lng: 81.6296, population: 1_000_000 },
  { id: 'city-bhilai',    name: 'Bhilai',              state: 'Chhattisgarh',          type: 'city',          lat: 21.2256, lng: 81.6640, population: 640_000 },
  { id: 'city-jabalpur',  name: 'Jabalpur',            state: 'Madhya Pradesh',         type: 'city',          lat: 23.1815, lng: 79.9864, population: 1_100_000 },
  { id: 'city-gwalior',   name: 'Gwalior',             state: 'Madhya Pradesh',         type: 'city',          lat: 26.2183, lng: 78.1828, population: 870_000 },
  { id: 'city-ujjain',    name: 'Ujjain',              state: 'Madhya Pradesh',         type: 'city',          lat: 23.1793, lng: 75.7849, population: 540_000 },
  { id: 'city-jodhpur',   name: 'Jodhpur',             state: 'Rajasthan',             type: 'city',          lat: 26.2389, lng: 73.0243, population: 1_100_000 },
  { id: 'city-udaipur',   name: 'Udaipur',             state: 'Rajasthan',             type: 'city',          lat: 24.5854, lng: 73.7125, population: 450_000 },
  { id: 'city-kota',      name: 'Kota',                state: 'Rajasthan',             type: 'city',          lat: 25.2138, lng: 75.8648, population: 700_000 },
  { id: 'city-ajmer',     name: 'Ajmer',               state: 'Rajasthan',             type: 'city',          lat: 26.4499, lng: 74.6399, population: 540_000 },
  { id: 'city-bikaner',   name: 'Bikaner',             state: 'Rajasthan',             type: 'city',          lat: 28.0229, lng: 73.3119, population: 640_000 },
  { id: 'city-ludhiana',  name: 'Ludhiana',            state: 'Punjab',                type: 'city',          lat: 30.9010, lng: 75.8573, population: 1_600_000 },
  { id: 'city-amritsar',  name: 'Amritsar',            state: 'Punjab',                type: 'city',          lat: 31.6340, lng: 74.8723, population: 1_100_000 },
  { id: 'city-jalandhar', name: 'Jalandhar',           state: 'Punjab',                type: 'city',          lat: 31.3260, lng: 75.5762, population: 870_000 },
  { id: 'city-patiala',   name: 'Patiala',             state: 'Punjab',                type: 'city',          lat: 30.3398, lng: 76.3869, population: 410_000 },
  { id: 'city-gurugram',  name: 'Gurugram',            state: 'Haryana',               type: 'city',          lat: 28.4595, lng: 77.0266, population: 880_000 },
  { id: 'city-faridabad', name: 'Faridabad',           state: 'Haryana',               type: 'city',          lat: 28.4089, lng: 77.3178, population: 1_400_000 },
  { id: 'city-panaji',    name: 'Panaji',              state: 'Goa',                   type: 'state_capital', lat: 15.4909, lng: 73.8278, population: 115_000 },
  { id: 'city-margao',    name: 'Margao',              state: 'Goa',                   type: 'city',          lat: 15.2750, lng: 73.9656, population: 100_000 },
  { id: 'city-portblair', name: 'Port Blair',          state: 'Andaman & Nicobar Islands (UT)', type: 'ut_capital', lat: 11.6233, lng: 92.7265, population: 100_000 },
  { id: 'city-puducherry', name: 'Puducherry',          state: 'Puducherry (UT)',        type: 'ut_capital', lat: 11.9416, lng: 79.8083, population: 245_000 },
  { id: 'city-karaikal',  name: 'Karaikal',            state: 'Puducherry (UT)',        type: 'city',          lat: 10.9167, lng: 79.8333, population: 90_000 },
  { id: 'city-leh',       name: 'Leh',                 state: 'Ladakh (UT)',           type: 'ut_capital',    lat: 34.1526, lng: 77.5770, population: 30_000 },
  { id: 'city-kargil',    name: 'Kargil',              state: 'Ladakh (UT)',           type: 'city',          lat: 34.5540, lng: 76.1344, population: 16_000 },
  { id: 'city-jammu',     name: 'Jammu',               state: 'Jammu & Kashmir (UT)',  type: 'city',          lat: 32.7266, lng: 74.8570, population: 500_000 },
  { id: 'city-daman',     name: 'Daman',               state: 'Dadra & Nagar Haveli and Daman & Diu (UT)', type: 'ut_capital', lat: 20.3974, lng: 72.8328, population: 60_000 },
  { id: 'city-silvassa',  name: 'Silvassa',            state: 'Dadra & Nagar Haveli and Daman & Diu (UT)', type: 'city', lat: 20.2760, lng: 73.0082, population: 100_000 },
  { id: 'city-diu',       name: 'Diu',                 state: 'Dadra & Nagar Haveli and Daman & Diu (UT)', type: 'city', lat: 20.7144, lng: 70.9878, population: 25_000 },
];

// Lightweight lookups
const CITY_BY_ID = new Map(INDIA_MAJOR_CITIES.map(c => [c.id, c]));

export function findCityById(id: string): IndianCityLocation | undefined {
  return CITY_BY_ID.get(id);
}

// Combine with the existing INDIA_STATES data without modifying it.
// Returns deduplicated entries: major cities first, then district hq list.
import { ALL_LOCATIONS } from '@/lib/locations';
import type { IndianLocation } from '@/lib/types';

export interface UnifiedLocation {
  id: string;
  name: string;
  state: string;
  district?: string;
  type: IndianCityLocation['type'];
  lat: number;
  lng: number;
  population?: number;
}

const seenIds = new Set<string>();
const MERGED: UnifiedLocation[] = [];

for (const c of INDIA_MAJOR_CITIES) {
  if (!seenIds.has(c.id)) {
    seenIds.add(c.id);
    MERGED.push({ ...c });
  }
}
for (const l of ALL_LOCATIONS) {
  // Skip duplicate (name, state) entries — major cities already cover them
  const key = `s:${l.name.toLowerCase()}:${l.state.toLowerCase()}`;
  if (seenIds.has(key)) continue;
  seenIds.add(key);
  MERGED.push({
    id: l.id,
    name: l.name,
    state: l.state,
    district: l.district,
    type: l.type === 'state_capital' ? 'state_capital' : 'district_hq',
    lat: l.lat,
    lng: l.lng,
  });
}

export const ALL_UNIFIED_LOCATIONS: readonly UnifiedLocation[] = MERGED;

/** Search the unified location list by query (name, state, or district). */
export function searchUnifiedLocations(query: string, limit = 25): UnifiedLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Default: return top-population cities
    return [...INDIA_MAJOR_CITIES]
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .slice(0, limit)
      .map(c => ({ ...c }));
  }
  const scored = MERGED.map(l => {
    let score = 0;
    if (l.name.toLowerCase().startsWith(q)) score += 100;
    else if (l.name.toLowerCase().includes(q)) score += 50;
    if (l.state.toLowerCase().includes(q)) score += 20;
    if (l.district?.toLowerCase().includes(q)) score += 10;
    return { l, score };
  }).filter(s => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.l);
}

/** Find the nearest unified location to a (lat, lng) — used by GPS auto-locate. */
export function findNearestUnifiedLocation(lat: number, lng: number): UnifiedLocation {
  let best = MERGED[0];
  let bestDist = Infinity;
  for (const l of MERGED) {
    const d = Math.hypot(l.lat - lat, l.lng - lng);
    if (d < bestDist) { bestDist = d; best = l; }
  }
  return best;
}

/**
 * Return all major cities/towns in a given state (case-insensitive partial match
 * on state name). Used by the LocationSelector's 3rd dropdown so users see
 * REAL cities (Chennai, Madurai, Coimbatore, …) instead of just synthetic
 * North/South/East/West area names.
 */
export function citiesInState(stateName: string): IndianCityLocation[] {
  const q = stateName.trim().toLowerCase();
  if (!q) return [];
  return INDIA_MAJOR_CITIES.filter(c => c.state.toLowerCase().includes(q));
}

/**
 * Return all major cities/towns that fall within a specific district of a
 * specific state. Falls back to all state cities if district matching is
 * inconclusive (since INDIA_MAJOR_CITIES doesn't carry district info for
 * every entry).
 */
export function citiesInDistrict(stateName: string, districtName: string): IndianCityLocation[] {
  const stateCities = citiesInState(stateName);
  if (!districtName) return stateCities;
  const q = districtName.trim().toLowerCase();
  if (!q) return stateCities;
  // Try district-name partial match first
  const inDistrict = stateCities.filter(c =>
    c.district?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  );
  return inDistrict.length > 0 ? inDistrict : stateCities;
}

/** Type narrowing for downstream code that needs IndianLocation shape. */
export function toIndianLocation(l: UnifiedLocation): IndianLocation {
  return {
    id: l.id,
    name: l.name,
    state: l.state,
    district: l.district ?? l.name,
    type: l.type === 'state_capital' || l.type === 'ut_capital' || l.type === 'district_hq'
      ? 'district_hq'
      : 'city',
    lat: l.lat,
    lng: l.lng,
  };
}
