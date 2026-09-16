'use client'

// ============================================================================
// ForecastChart — temperature + precipitation visualization.
// Uses recharts (already in package.json). Two modes:
//   "hourly": 24h line chart of temperature + precipitation probability
//   "daily":  7-day combo chart (temp max/min bars + precipitation line)
// Fits the existing UI style — small, dark-aware, no redesign.
// ============================================================================

import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type {
  RealDailyForecast, RealHourlyForecast,
} from '@/services/weather/types'

interface Props {
  hourly: RealHourlyForecast[]
  daily: RealDailyForecast[]
  mode: 'hourly' | 'daily'
}

export function ForecastChart({ hourly, daily, mode }: Props) {
  const data = useMemo(() => {
    if (mode === 'hourly') {
      return hourly.map(h => ({
        label: new Date(h.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        temperature: h.temperature,
        feelsLike: h.feelsLike,
        precipitation: h.precipitation,
        precipitationProb: h.precipitationProbability,
        windSpeed: h.windSpeed,
      }))
    }
    return daily.map(d => ({
      label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }),
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      precipitation: d.precipitation,
      precipitationProb: d.precipitationProbability,
      windSpeedMax: d.windSpeedMax,
    }))
  }, [hourly, daily, mode])

  return (
    <div className="h-44 w-full text-xs">
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'hourly' ? (
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} stroke="currentColor" />
            <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 9 }} stroke="#f97316" unit="°" />
            <YAxis yAxisId="precip" orientation="right" tick={{ fontSize: 9 }} stroke="#3b82f6" unit="mm" />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="Temp (°C)"
              stroke="#f97316"
              fill="url(#tempGrad)"
              strokeWidth={2}
            />
            <Bar
              yAxisId="precip"
              dataKey="precipitation"
              name="Precip (mm)"
              fill="url(#precipGrad)"
            />
          </ComposedChart>
        ) : (
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="tempMaxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="tempMinGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="currentColor" />
            <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 9 }} stroke="#f97316" unit="°" />
            <YAxis yAxisId="precip" orientation="right" tick={{ fontSize: 9 }} stroke="#3b82f6" unit="mm" />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="temp" dataKey="tempMax" name="Max (°C)" fill="url(#tempMaxGrad)" radius={[3,3,0,0]} />
            <Bar yAxisId="temp" dataKey="tempMin" name="Min (°C)" fill="url(#tempMinGrad)" radius={[3,3,0,0]} />
            <Line
              yAxisId="precip"
              type="monotone"
              dataKey="precipitation"
              name="Precip (mm)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
