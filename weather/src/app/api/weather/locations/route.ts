// ============================================================================
// GET /api/weather/locations?q=<query>&limit=40
// Nationwide India location search.
//
// Search strategy:
// 1) Always search the bundled city + district dataset for instant/offline hits.
// 2) For queries with 2+ characters, augment those results with Open-Meteo's
//    GeoNames-backed Geocoding API, filtered to countryCode=IN. This means the
//    search bar can resolve far more Indian cities, towns, villages and postal
//    code indexed places than we can reasonably ship as a static bundle.
// 3) Deduplicate local/remote results and keep everything coordinate-backed so
//    selecting any result can immediately recenter the map and fetch weather.
//
// The existing nearest=lat,lng behaviour is preserved for GPS fallback.
// ============================================================================

import { NextResponse } from 'next/server';
import {
  searchUnifiedLocations,
  findNearestUnifiedLocation,
} from '@/lib/india-cities';
import type {
  ApiResponse,
  LocationSearchResult,
  IndianCityLocation,
} from '@/services/weather/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const GEOCODING_TIMEOUT_MS = 6500;

type OpenMeteoGeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  population?: number;
  postcodes?: string[];
};

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
  error?: boolean;
  reason?: string;
};

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function typeFromFeatureCode(
  featureCode: string | undefined,
  population: number | undefined,
): IndianCityLocation['type'] {
  const code = (featureCode ?? '').toUpperCase();

  // GeoNames PPLC = capital of a political entity; PPLA* = admin capital.
  if (code === 'PPLC' || code.startsWith('PPLA')) return 'state_capital';
  if (code.startsWith('PPL')) {
    if ((population ?? 0) >= 100_000) return 'city';
    if ((population ?? 0) >= 10_000) return 'town';
    return 'town';
  }

  // Administrative results are still useful weather lookup points.
  if (code.startsWith('ADM')) return 'district_hq';
  return 'town';
}

function remoteToLocation(r: OpenMeteoGeocodingResult): LocationSearchResult | null {
  if (r.country_code?.toUpperCase() !== 'IN') return null;
  if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return null;

  const state = r.admin1?.trim() || 'India';
  const district = r.admin2?.trim() || r.admin3?.trim() || r.admin4?.trim() || r.name;

  return {
    id: `geonames-in-${r.id}`,
    name: r.name,
    state,
    district,
    type: typeFromFeatureCode(r.feature_code, r.population),
    lat: r.latitude,
    lng: r.longitude,
    population: r.population,
  };
}

function locationKey(loc: LocationSearchResult): string {
  // Name/state first, then rounded coordinates to prevent the same settlement
  // appearing twice when the bundled dataset and GeoNames both contain it.
  return [
    normalize(loc.name),
    normalize(loc.state),
    loc.lat.toFixed(3),
    loc.lng.toFixed(3),
  ].join('|');
}

async function searchOpenMeteoIndia(
  query: string,
  count: number,
): Promise<LocationSearchResult[]> {
  if (query.trim().length < 2) return [];

  const params = new URLSearchParams({
    name: query.trim(),
    count: String(Math.max(1, Math.min(100, count))),
    language: 'en',
    format: 'json',
    countryCode: 'IN',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);

  try {
    const res = await fetch(`${GEOCODING_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!res.ok) return [];

    const json = (await res.json()) as OpenMeteoGeocodingResponse;
    return (json.results ?? [])
      .map(remoteToLocation)
      .filter((v): v is LocationSearchResult => v !== null);
  } catch {
    // Remote search is additive. Offline/slow networks should still retain the
    // bundled Indian location search rather than fail the selector entirely.
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limitParam = parseInt(url.searchParams.get('limit') ?? '40', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100
    ? limitParam
    : 40;
  const nearest = url.searchParams.get('nearest');

  if (nearest) {
    const [latStr, lngStr] = nearest.split(',');
    const lat = parseFloat(latStr ?? '');
    const lng = parseFloat(lngStr ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, data: null, error: 'Invalid nearest=lat,lng', errorCode: 'INVALID_LOCATION' },
        { status: 200 },
      );
    }
    const loc = findNearestUnifiedLocation(lat, lng);
    const out: LocationSearchResult = {
      id: loc.id,
      name: loc.name,
      state: loc.state,
      district: loc.district,
      type: loc.type,
      lat: loc.lat,
      lng: loc.lng,
      population: loc.population,
    };
    return NextResponse.json<ApiResponse<LocationSearchResult>>(
      { ok: true, data: out, error: null },
      { status: 200 },
    );
  }

  const localResults: LocationSearchResult[] = searchUnifiedLocations(q, limit).map(r => ({
    id: r.id,
    name: r.name,
    state: r.state,
    district: r.district,
    type: r.type,
    lat: r.lat,
    lng: r.lng,
    population: r.population,
  }));

  const remoteResults = await searchOpenMeteoIndia(q, Math.min(100, limit * 2));

  const seen = new Set<string>();
  const merged: LocationSearchResult[] = [];
  for (const loc of [...localResults, ...remoteResults]) {
    const key = locationKey(loc);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(loc);
    if (merged.length >= limit) break;
  }

  return NextResponse.json<ApiResponse<LocationSearchResult[]>>(
    { ok: true, data: merged, error: null },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
