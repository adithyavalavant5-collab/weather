// ============================================================================
// GET /api/weather/current?lat=..&lng=..&name=..&state=..&id=..
// Returns the current weather observation for a single lat/lng point.
// Respects WEATHER_DATA_SOURCE (real | simulator) and WEATHER_PROVIDER.
// ============================================================================

import { NextResponse } from 'next/server';
import { getForecast } from '@/services/weather/weatherService';
import type { ApiResponse, RealCurrentWeather } from '@/services/weather/types';
import type { ProviderLocation } from '@/services/weather/providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseQuery(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const name = url.searchParams.get('name') ?? 'Unknown';
  const state = url.searchParams.get('state') ?? 'Unknown';
  const id = url.searchParams.get('id') ?? `${lat.toFixed(4)},${lng.toFixed(4)}`;
  return { lat, lng, name, state, id };
}

export async function GET(req: Request) {
  const { lat, lng, name, state, id } = parseQuery(req);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, data: null, error: 'Invalid or missing lat/lng', errorCode: 'INVALID_LOCATION' },
      { status: 200 },
    );
  }
  // Reject points outside India's broad bbox (we still allow a margin)
  if (lat < 6 || lat > 38 || lng < 67 || lng > 98) {
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, data: null, error: 'Location outside India bounding box', errorCode: 'INVALID_LOCATION' },
      { status: 200 },
    );
  }

  const loc: ProviderLocation = { id, name, state };
  const resp = await getForecast({ lat, lng }, loc);
  if (!resp.ok || !resp.data) {
    return NextResponse.json<ApiResponse<RealCurrentWeather>>(
      {
        ok: false,
        data: null,
        error: resp.error,
        errorCode: resp.errorCode,
        dataSource: resp.dataSource,
        providerName: resp.providerName,
      },
      { status: 200 },
    );
  }
  return NextResponse.json<ApiResponse<RealCurrentWeather>>(
    {
      ok: true,
      data: resp.data.current,
      error: null,
      cachedAt: resp.cachedAt,
      stale: resp.stale,
      dataSource: resp.dataSource,
      providerName: resp.providerName,
    },
    { status: 200 },
  );
}
