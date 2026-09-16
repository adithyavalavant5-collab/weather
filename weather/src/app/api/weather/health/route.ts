// ============================================================================
// GET /api/weather/health
// Returns server-side health snapshot: data source mode, provider name,
// cache TTL, refresh interval, last successful fetch, last error.
// Used by the UI to surface "stale" / "down" status badges.
// ============================================================================

import { NextResponse } from 'next/server';
import { getHealth } from '@/services/weather/weatherService';
import type { ApiResponse, WeatherServiceHealth } from '@/services/weather/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const health = getHealth();
  return NextResponse.json<ApiResponse<WeatherServiceHealth>>(
    { ok: true, data: health, error: null },
    { status: 200 },
  );
}
