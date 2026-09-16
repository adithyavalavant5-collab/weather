// ============================================================================
// GET  /api/weather/source — returns { env, override, effective }
// POST /api/weather/source { source: "real" | "simulator" | null }
//   Sets the runtime override. Persists in-memory only (resets on restart,
//   at which point the WEATHER_DATA_SOURCE env var takes over).
// Allows the user to toggle between real and simulator from the UI without
// a server restart.
// ============================================================================

import { NextResponse } from 'next/server';
import {
  setDataSourceOverride,
  getDataSourceOverride,
  getDataSource,
} from '@/services/weather/weatherService';
import type { ApiResponse } from '@/services/weather/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json<ApiResponse<{
    env: string;
    override: 'real' | 'simulator' | null;
    effective: 'real' | 'simulator';
  }>>(
    {
      ok: true,
      data: {
        env: process.env.WEATHER_DATA_SOURCE || 'simulator',
        override: getDataSourceOverride(),
        effective: getDataSource(),
      },
      error: null,
    },
    { status: 200 },
  );
}

export async function POST(req: Request) {
  let body: { source?: string | null } = {};
  try {
    body = (await req.json()) as { source?: string | null };
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, data: null, error: 'Invalid JSON body', errorCode: 'MALFORMED_RESPONSE' },
      { status: 200 },
    );
  }
  const s = body.source;
  if (s === 'real' || s === 'simulator' || s === null || s === undefined) {
    setDataSourceOverride((s as 'real' | 'simulator' | null) ?? null);
    return NextResponse.json<ApiResponse<{ effective: 'real' | 'simulator' }>>(
      { ok: true, data: { effective: getDataSource() }, error: null },
      { status: 200 },
    );
  }
  return NextResponse.json<ApiResponse<never>>(
    {
      ok: false,
      data: null,
      error: 'source must be "real", "simulator", or null',
      errorCode: 'INVALID_LOCATION',
    },
    { status: 200 },
  );
}
