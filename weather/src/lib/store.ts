'use client'

import { create } from 'zustand'
import { LanguageCode, DataMode, IndianLocation, WeatherAlert } from '@/lib/types'

interface AppState {
  // Selected location
  location: IndianLocation | null
  setLocation: (loc: IndianLocation | null) => void

  // Language
  language: LanguageCode
  setLanguage: (l: LanguageCode) => void

  // Data mode
  dataMode: DataMode
  setDataMode: (m: DataMode) => void

  // Live clock — initialized to 0 on SSR, populated client-side on mount
  now: number // epoch ms (0 = not yet hydrated)
  setNow: (t: number) => void
  tickNow: () => void

  // GPS permission state
  gpsPermission: 'granted' | 'denied' | 'prompt' | 'unsupported'
  setGpsPermission: (p: 'granted' | 'denied' | 'prompt' | 'unsupported') => void

  // View mode
  viewMode: 'citizen' | 'admin'
  setViewMode: (v: 'citizen' | 'admin') => void

  // Active alerts (most recent first)
  alerts: WeatherAlert[]
  pushAlert: (a: WeatherAlert) => void
  dismissAlert: (id: string) => void
  clearAlerts: () => void

  // Real-time weather update tick (drives re-render of live cards)
  liveTick: number
  bumpLiveTick: () => void

  // Last WebSocket update timestamp
  lastWsUpdate: number | null
  setLastWsUpdate: (t: number | null) => void

  // Pause state (for demo)
  paused: boolean
  setPaused: (p: boolean) => void

  // Thresholds (admin-configurable)
  thresholds: { monitor: number; warning: number; highPriority: number; critical: number }
  setThresholds: (t: { monitor: number; warning: number; highPriority: number; critical: number }) => void
}

export const useAppStore = create<AppState>((set) => ({
  location: null,
  setLocation: (loc) => set({ location: loc }),

  language: 'en',
  setLanguage: (l) => set({ language: l }),

  dataMode: 'DEMO',
  setDataMode: (m) => set({ dataMode: m }),

  // Live clock — initialized to 0 to avoid SSR hydration mismatch;
  // populated client-side on mount.
  now: 0,
  setNow: (t: number) => set({ now: t }),
  tickNow: () => set({ now: Date.now() }),

  gpsPermission: 'prompt',
  setGpsPermission: (p) => set({ gpsPermission: p }),

  viewMode: 'citizen',
  setViewMode: (v) => set({ viewMode: v }),

  alerts: [],
  pushAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts.filter(x => x.id !== a.id)].slice(0, 50) })),
  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter(x => x.id !== id) })),
  clearAlerts: () => set({ alerts: [] }),

  liveTick: 0,
  bumpLiveTick: () => set((s) => ({ liveTick: s.liveTick + 1 })),

  lastWsUpdate: null,
  setLastWsUpdate: (t) => set({ lastWsUpdate: t }),

  paused: false,
  setPaused: (p) => set({ paused: p }),

  thresholds: { monitor: 40, warning: 60, highPriority: 80, critical: 90 },
  setThresholds: (t) => set({ thresholds: t }),
}))
