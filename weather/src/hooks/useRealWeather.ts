'use client'

// ============================================================================
// useRealWeather — resilient client weather fetcher.
//
// Termux/slow-device behaviour:
// - Seeds an instant LOCAL simulator forecast before the first API response, so
//   the UI never sits indefinitely on "Loading…" while Next.js compiles a route.
// - Only one mounted caller should use automatic effects. Child controls use
//   { enabled: false } and call the actions manually.
// - Real API data replaces the local fallback as soon as it arrives.
// ============================================================================

import { useCallback, useEffect, useRef } from 'react'
import { useRealWeatherStore } from '@/lib/real-weather-store'
import { buildClientWeatherFallback } from '@/lib/client-weather-fallback'
import type {
  ApiResponse,
  RealForecast,
  RealWeatherAlert,
  WeatherServiceHealth,
} from '@/services/weather/types'

export interface UseRealWeatherArgs {
  refreshIntervalMs?: number
  enabled?: boolean
}

export interface RealWeatherApi {
  fetchForecast: (force?: boolean) => Promise<void>
  fetchAlerts: (force?: boolean) => Promise<void>
  fetchHealth: () => Promise<void>
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as T
  } finally {
    window.clearTimeout(timer)
  }
}

function useRealWeatherFetcher() {
  const {
    activeLocationId,
    activeLocationName,
    activeLocationState,
    activeLat,
    activeLng,
    setForecast,
    setAlerts,
    setStatus,
    setLastError,
    setIsStale,
    setIsFallbackSimulator,
  } = useRealWeatherStore()

  return useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!activeLocationId || activeLat == null || activeLng == null) return

      const stateAtStart = useRealWeatherStore.getState()
      const hasForecastForThisLocation = stateAtStart.forecast?.locationId === activeLocationId

      // IMPORTANT FOR TERMUX / SLOW FIRST COMPILE:
      // Show useful data immediately. This is clearly tagged as simulator data
      // and is replaced by real weather when the API response arrives.
      if (!hasForecastForThisLocation) {
        const fallback = buildClientWeatherFallback({
          id: activeLocationId,
          name: activeLocationName || 'Selected location',
          state: activeLocationState || 'India',
          lat: activeLat,
          lng: activeLng,
        })
        setForecast(fallback)
        setAlerts([])
        setStatus('success')
        setLastError('Connecting to live Open-Meteo data…')
        setIsStale(false)
        setIsFallbackSimulator(true)
      } else if (opts.force) {
        // Only show an active spinner for an explicit refresh. Background
        // refreshes keep the current forecast visible.
        setStatus('loading')
      }

      const params = new URLSearchParams({
        lat: String(activeLat),
        lng: String(activeLng),
        name: activeLocationName,
        state: activeLocationState,
        id: activeLocationId,
        ...(opts.force ? { _t: String(Date.now()) } : {}),
      })

      let forecastSucceeded = false
      try {
        // First-time compilation of a Next.js API route can be slow on Android,
        // so allow enough time while the instant local forecast stays visible.
        const fcJson = await fetchJsonWithTimeout<ApiResponse<RealForecast>>(
          `/api/weather/forecast?${params.toString()}`,
          20000,
        )

        if (fcJson.ok && fcJson.data) {
          setForecast(fcJson.data)
          setIsStale(!!fcJson.stale)
          setIsFallbackSimulator(
            fcJson.dataSource === 'simulator' &&
            !!fcJson.error &&
            fcJson.providerName?.includes('fallback') === true,
          )
          setLastError(fcJson.error ?? null)
          setStatus('success')
          forecastSucceeded = true
        } else {
          setLastError(fcJson.error ?? 'Failed to fetch weather')
          setStatus(useRealWeatherStore.getState().forecast ? 'stale' : 'error')
          setIsFallbackSimulator(true)
        }
      } catch (err) {
        const msg = err instanceof Error
          ? (err.name === 'AbortError' ? 'Real weather request timed out; local fallback remains active' : err.message)
          : 'Network failure; local fallback remains active'
        setLastError(msg)
        setStatus(useRealWeatherStore.getState().forecast ? 'stale' : 'error')
        setIsFallbackSimulator(true)
      }

      // Alerts are best-effort and MUST NOT block the forecast UI.
      if (forecastSucceeded) {
        try {
          const alJson = await fetchJsonWithTimeout<ApiResponse<RealWeatherAlert[]>>(
            `/api/weather/alerts?${params.toString()}`,
            10000,
          )
          if (alJson.ok && alJson.data) setAlerts(alJson.data)
        } catch {
          // Keep the successful forecast visible even if alerts fail.
        }
      }
    },
    [
      activeLocationId,
      activeLocationName,
      activeLocationState,
      activeLat,
      activeLng,
      setForecast,
      setAlerts,
      setStatus,
      setLastError,
      setIsStale,
      setIsFallbackSimulator,
    ],
  )
}

function useHealthFetcher() {
  const { setHealth } = useRealWeatherStore()
  return useCallback(async () => {
    try {
      const json = await fetchJsonWithTimeout<ApiResponse<WeatherServiceHealth>>(
        '/api/weather/health',
        15000,
      )
      if (json.ok && json.data) {
        setHealth(json.data)
        if (json.data.refreshIntervalMs > 0) {
          useRealWeatherStore.getState().setRefreshIntervalMs(json.data.refreshIntervalMs)
        }
      }
    } catch {
      // Health is informational and never blocks the app.
    }
  }, [setHealth])
}

export function useRealWeather(opts: UseRealWeatherArgs = {}): RealWeatherApi {
  const enabled = opts.enabled ?? true
  const refreshIntervalMs = opts.refreshIntervalMs ?? 0
  const fetchForecastInternal = useRealWeatherFetcher()
  const fetchHealth = useHealthFetcher()
  const activeLocationId = useRealWeatherStore(s => s.activeLocationId)
  const storeRefresh = useRealWeatherStore(s => s.refreshIntervalMs)
  const intervalToUse = refreshIntervalMs > 0 ? refreshIntervalMs : storeRefresh
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled || !activeLocationId) return
    void fetchForecastInternal()
    void fetchHealth()
  }, [activeLocationId, enabled, fetchForecastInternal, fetchHealth])

  useEffect(() => {
    if (!enabled || !activeLocationId || intervalToUse <= 0) return

    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(() => {
      // Force the route request so each sync checks the provider/cache window
      // instead of reusing a browser-level response.
      void fetchForecastInternal({ force: true })
      void fetchHealth()
    }, intervalToUse)

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchForecastInternal({ force: true })
        void fetchHealth()
      }
    }
    const refreshWhenOnline = () => {
      void fetchForecastInternal({ force: true })
      void fetchHealth()
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('online', refreshWhenOnline)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('online', refreshWhenOnline)
    }
  }, [activeLocationId, enabled, intervalToUse, fetchForecastInternal, fetchHealth])

  return {
    fetchForecast: (force) => fetchForecastInternal({ force: !!force }),
    fetchAlerts: (force) => fetchForecastInternal({ force: !!force }),
    fetchHealth,
  }
}
