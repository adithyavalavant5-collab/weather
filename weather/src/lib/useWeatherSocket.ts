'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store'
import { buildAlert, generateForecast } from '@/lib/weather-engine'
import { IndianLocation, WeatherAlert } from '@/lib/types'

interface WeatherUpdatePayload {
  type: 'snapshot' | 'tick'
  tick?: number
  timestamp: number
  location: {
    id: string
    name: string
    state: string
    district: string
    lat: number
    lng: number
  }
  risk: number
  prevRisk?: number
  trend: 'rising' | 'falling' | 'stable'
  delta: number
  dataStatus: 'LIVE' | 'RECENT' | 'DELAYED' | 'STALE' | 'OFFLINE'
  mode: 'LIVE' | 'DEMO'
}

interface AlertPayload {
  id: string
  timestamp: number
  location: { id: string; name: string; state: string }
  hazard: string
  risk: number
  prevRisk: number
  severity: 'high_priority' | 'critical'
  channels: string[]
  message: string
}

export function useWeatherSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [latestUpdate, setLatestUpdate] = useState<WeatherUpdatePayload | null>(null)
  const [latestAlert, setLatestAlert] = useState<AlertPayload | null>(null)

  const location = useAppStore(s => s.location)
  const pushAlert = useAppStore(s => s.pushAlert)
  const bumpLiveTick = useAppStore(s => s.bumpLiveTick)
  const setLastWsUpdate = useAppStore(s => s.setLastWsUpdate)
  const paused = useAppStore(s => s.paused)

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('weather_update', (payload: WeatherUpdatePayload) => {
      setLatestUpdate(payload)
      setLastWsUpdate(payload.timestamp)
      bumpLiveTick()
    })

    socket.on('alert_triggered', (payload: AlertPayload) => {
      setLatestAlert(payload)
      // Convert to app-level alert
      if (location) {
        const newAlert = buildAlert(
          location,
          payload.hazard as any,
          payload.risk,
          90 + Math.random() * 5,
          payload.timestamp,
        )
        pushAlert(newAlert)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Subscribe to location changes
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !connected) return
    if (paused) return
    if (location) {
      socket.emit('subscribe', {
        locationId: location.id,
        locationName: location.name,
        state: location.state,
        district: location.district,
        lat: location.lat,
        lng: location.lng,
      })
      // Also request an immediate snapshot
      socket.emit('request_snapshot')
    }
  }, [location, connected, paused])

  // Unsubscribe when location changes
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    return () => {
      if (location) socket.emit('unsubscribe', location.id)
    }
  }, [location])

  // Reset demo
  const resetDemo = () => {
    socketRef.current?.emit('reset_demo')
    socketRef.current?.emit('request_snapshot')
  }

  return { connected, latestUpdate, latestAlert, resetDemo }
}

// Helper to convert IndianLocation to subscribe payload shape (for emit)
export function buildSubscribePayload(loc: IndianLocation) {
  return {
    locationId: loc.id,
    locationName: loc.name,
    state: loc.state,
    district: loc.district,
    lat: loc.lat,
    lng: loc.lng,
  }
}
