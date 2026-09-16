// ============================================================================
// GET /api/weather/forecast?lat=..&lng=..&name=..&state=..&id=..
// Returns the full forecast: current + hourly (24h) + daily (7d).
// ============================================================================

import { NextResponse } from 'next/server';
import { getForecast } from '@/services/weather/weatherService';
import type { ApiResponse, RealForecast } from '@/services/weather/types';
import type { ProviderLocation } from '@/services/weather/providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const name = url.searchParams.get('name') ?? 'Unknown';
  const state = url.searchParams.get('state') ?? 'Unknown';
  const id = url.searchParams.get('id') ?? `${lat.toFixed(4)},${lng.toFixed(4)}`;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, data: null, error: 'Invalid or missing lat/lng', errorCode: 'INVALID_LOCATION' },
      { status: 200 },
    );
  }
  if (lat < 6 || lat > 38 || lng < 67 || lng > 98) {
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, data: null, error: 'Location outside India bounding box', errorCode: 'INVALID_LOCATION' },
      { status: 200 },
    );
  }

  const loc: ProviderLocation = { id, name, state };
  const resp = await getForecast({ lat, lng }, loc);
  return NextResponse.json<ApiResponse<RealForecast>>(
    {
      ok: resp.ok,
      data: resp.data,
      error: resp.error,
      errorCode: resp.errorCode,
      cachedAt: resp.cachedAt,
      stale: resp.stale,
      dataSource: resp.dataSource,
      providerName: resp.providerName,
    },
    { status: 200 },
  );
}
