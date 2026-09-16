// Weather Simulator WebSocket Mini-Service
// Pushes evolving weather/risk/alert events to the Next.js dashboard on port 3003
// Frontend connects via: io('/?XTransformPort=3003')

import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Per-location simulation state (lightweight — recalculated on each tick)
interface LocationState {
  locationId: string
  locationName: string
  state: string
  district: string
  lat: number
  lng: number
  currentRisk: number
  trend: 'rising' | 'falling' | 'stable'
  lastPushAt: number
}

// Tick interval (configurable via env)
const TICK_MS = 5000 // push every 5 seconds
const ALERT_THRESHOLD = 80 // above this, raise a high-priority warning

console.log(`[weather-simulator] tick interval: ${TICK_MS}ms`)

// Stable per-location seeded RNG so different locations have different scenarios
function seededRandom(seed: number): () => number {
  let s = seed > 0 ? seed : 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

// Compute a "live" risk value for a location at the current time
function computeLiveRisk(loc: LocationState, now: number): {
  risk: number
  trend: 'rising' | 'falling' | 'stable'
  delta: number
} {
  const seed = Math.floor((Math.abs(loc.lat) * 1000 + Math.abs(loc.lng) * 1000))
  const rng = seededRandom(seed + Math.floor(now / (15 * 60 * 1000)))
  const nextRng = seededRandom(seed + Math.floor((now + 15 * 60 * 1000) / (15 * 60 * 1000)))
  const cur = loc.currentRisk || rng() * 100
  // Trend: rising if next bucket higher, falling if lower, else stable
  const next = cur + (nextRng() - 0.45) * 25
  const trend: 'rising' | 'falling' | 'stable' = next > cur + 3 ? 'rising' : next < cur - 3 ? 'falling' : 'stable'
  const delta = Math.round(next - cur)
  return { risk: Math.round(next), trend, delta }
}

io.on('connection', (socket) => {
  console.log(`[weather-simulator] client connected: ${socket.id}`)

  // Client subscribes to a specific location
  socket.on('subscribe', (data: {
    locationId: string
    locationName: string
    state: string
    district: string
    lat: number
    lng: number
  }) => {
    socket.join(`loc-${data.locationId}`)
    const state: LocationState = {
      locationId: data.locationId,
      locationName: data.locationName,
      state: data.state,
      district: data.district,
      lat: data.lat,
      lng: data.lng,
      currentRisk: 35 + Math.random() * 30,
      trend: 'stable',
      lastPushAt: Date.now(),
    }
    socket.data.state = state
    console.log(`[weather-simulator] ${socket.id} subscribed to ${data.locationName}, ${data.state}`)
    socket.emit('subscribed', { ok: true, locationId: data.locationId })
  })

  socket.on('unsubscribe', (locationId: string) => {
    socket.leave(`loc-${locationId}`)
    socket.data.state = null
    console.log(`[weather-simulator] ${socket.id} unsubscribed`)
  })

  socket.on('request_snapshot', () => {
    const st: LocationState | undefined = socket.data?.state
    if (!st) return
    const now = Date.now()
    const { risk, trend, delta } = computeLiveRisk(st, now)
    st.currentRisk = risk
    st.trend = trend
    socket.emit('weather_update', {
      type: 'snapshot',
      timestamp: now,
      location: {
        id: st.locationId,
        name: st.locationName,
        state: st.state,
        district: st.district,
        lat: st.lat,
        lng: st.lng,
      },
      risk,
      trend,
      delta,
      dataStatus: 'LIVE',
      mode: 'DEMO',
    })
  })

  socket.on('reset_demo', () => {
    const st: LocationState | undefined = socket.data?.state
    if (st) {
      st.currentRisk = 35 + Math.random() * 30
      st.trend = 'stable'
      console.log(`[weather-simulator] ${socket.id} demo reset`)
    }
  })

  socket.on('disconnect', () => {
    console.log(`[weather-simulator] ${socket.id} disconnected`)
  })
})

// Global ticker: pushes weather_update + alert events to all subscribed clients
let tick = 0
setInterval(() => {
  tick++
  const now = Date.now()

  for (const [_, socket] of io.sockets.sockets) {
    const st: LocationState | undefined = socket.data?.state
    if (!st) continue

    const { risk, trend, delta } = computeLiveRisk(st, now)
    const prevRisk = st.currentRisk
    st.currentRisk = risk
    st.trend = trend

    // Push weather/risk update
    socket.emit('weather_update', {
      type: 'tick',
      tick,
      timestamp: now,
      location: {
        id: st.locationId,
        name: st.locationName,
        state: st.state,
        district: st.district,
        lat: st.lat,
        lng: st.lng,
      },
      risk,
      prevRisk,
      trend,
      delta,
      dataStatus: 'LIVE',
      mode: 'DEMO',
    })

    // Trigger an alert when crossing the threshold upward
    if (prevRisk < ALERT_THRESHOLD && risk >= ALERT_THRESHOLD) {
      socket.emit('alert_triggered', {
        id: `alert-${st.locationId}-${now}`,
        timestamp: now,
        location: {
          id: st.locationId,
          name: st.locationName,
          state: st.state,
        },
        hazard: detectHazard(st, risk),
        risk,
        prevRisk,
        severity: risk > 90 ? 'critical' : 'high_priority',
        channels: ['app', 'sms', 'ivr', 'siren', 'push', 'authority_dashboard'],
        message: `SEVERE WEATHER ALERT: ${detectHazard(st, risk).toUpperCase()} expected in ${st.locationName} within 1 hour. Risk: ${risk}%. SEEK SHELTER IMMEDIATELY.`,
      })
    }
  }
}, TICK_MS)

function detectHazard(st: LocationState, risk: number): string {
  const coastalStates = ['Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Odisha', 'West Bengal', 'Maharashtra', 'Gujarat', 'Goa', 'Puducherry (UT)']
  const isCoastal = coastalStates.includes(st.state)
  const month = new Date().getMonth() + 1
  const isMonsoon = month >= 6 && month <= 9
  if (isCoastal && (month === 10 || month === 11) && risk > 85) return 'cyclone'
  if (isMonsoon && risk > 85) return isCoastal ? 'flash_flood' : 'cloudburst'
  if (risk > 80) return 'lightning'
  if (risk > 60) return 'thunderstorm'
  return 'heavy_rain'
}

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[weather-simulator] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[weather-simulator] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[weather-simulator] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
