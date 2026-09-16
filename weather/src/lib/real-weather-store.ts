'use client'

// ============================================================================
// Real-Weather Zustand store (NEW — isolated from existing store.ts).
// Holds the latest fetched forecast, alerts, status, and refresh state.
// Does NOT touch existing useAppStore state.
// ============================================================================

import { create } from 'zustand'
import type {
  FetchStatus,
  RealForecast,
  RealWeatherAlert,
  WeatherServiceHealth,
} from '@/services/weather/types'

export interface RealWeatherState {
  // Active location for the live-weather panel
  activeLocationId: string | null
  activeLocationName: string
  activeLocationState: string
  activeLat: number | null
  activeLng: number | null
  setActiveLocation: (loc: {
    id: string
    name: string
    state: string
    lat: number
    lng: number
  }) => void

  // Last successful forecast
  forecast: RealForecast | null
  lastForecastAt: number | null
  setForecast: (fc: RealForecast | null) => void

  // Alerts for the active location
  alerts: RealWeatherAlert[]
  setAlerts: (a: RealWeatherAlert[]) => void

  // Fetch status (drives loading/error UI)
  status: FetchStatus
  setStatus: (s: FetchStatus) => void

  // Last error message
  lastError: string | null
  setLastError: (e: string | null) => void

  // Server-side health snapshot
  health: WeatherServiceHealth | null
  setHealth: (h: WeatherServiceHealth | null) => void

  // Auto-refresh interval (ms). 0 = off.
  refreshIntervalMs: number
  setRefreshIntervalMs: (n: number) => void

  // Whether the latest data is stale (served from cache during upstream failure)
  isStale: boolean
  setIsStale: (b: boolean) => void

  // Whether the data shown is fallback simulator (real API was down)
  isFallbackSimulator: boolean
  setIsFallbackSimulator: (b: boolean) => void
}

export const useRealWeatherStore = create<RealWeatherState>((set) => ({
  activeLocationId: null,
  activeLocationName: '',
  activeLocationState: '',
  activeLat: null,
  activeLng: null,
  setActiveLocation: (loc) =>
    set({
      activeLocationId: loc.id,
      activeLocationName: loc.name,
      activeLocationState: loc.state,
      activeLat: loc.lat,
      activeLng: loc.lng,
    }),

  forecast: null,
  lastForecastAt: null,
  setForecast: (fc) =>
    set({
      forecast: fc,
      lastForecastAt: fc ? fc.fetchedAt : null,
    }),

  alerts: [],
  setAlerts: (a) => set({ alerts: a }),

  status: 'idle',
  setStatus: (s) => set({ status: s }),

  lastError: null,
  setLastError: (e) => set({ lastError: e }),

  health: null,
  setHealth: (h) => set({ health: h }),

  refreshIntervalMs: 60000, // 1 min default; mirrored from env on client mount
  setRefreshIntervalMs: (n) => set({ refreshIntervalMs: n }),

  isStale: false,
  setIsStale: (b) => set({ isStale: b }),

  isFallbackSimulator: false,
  setIsFallbackSimulator: (b) => set({ isFallbackSimulator: b }),
}))
