'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { INDIA_STATES, findNearestLocation } from '@/lib/locations'
import { searchUnifiedLocations, citiesInState } from '@/lib/india-cities'
import { useAppStore } from '@/lib/store'
import { t } from '@/lib/translations'
import type { IndianLocation } from '@/lib/types'
import type { ApiResponse, LocationSearchResult } from '@/services/weather/types'
import {
  MapPin, Search, Navigation, X, Building2, Landmark, TreePine, Loader2, Globe2,
} from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toAppLocation(loc: LocationSearchResult): IndianLocation {
  const type: IndianLocation['type'] =
    loc.type === 'state_capital' || loc.type === 'ut_capital'
      ? 'state_capital'
      : loc.type === 'district_hq'
        ? 'district_hq'
        : loc.type === 'town'
          ? 'town'
          : 'city'

  return {
    id: loc.id,
    name: loc.name,
    state: loc.state,
    district: loc.district || loc.name,
    type,
    lat: loc.lat,
    lng: loc.lng,
    population: loc.population,
  }
}

function dedupeLocations(locations: IndianLocation[]): IndianLocation[] {
  const seen = new Set<string>()
  const out: IndianLocation[] = []
  for (const loc of locations) {
    const key = `${loc.name.toLowerCase()}|${loc.state.toLowerCase()}|${loc.lat.toFixed(3)}|${loc.lng.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(loc)
  }
  return out
}

export function LocationSelector({ open, onOpenChange }: Props) {
  const { location, setLocation, language, setGpsPermission } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [remoteResults, setRemoteResults] = useState<IndianLocation[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedStateCode, setSelectedStateCode] = useState<string>('')
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string>('')

  const lang = language

  // Instant bundled results make search responsive even without internet.
  const localSearchResults = useMemo<IndianLocation[]>(() => {
    const q = searchQuery.trim()
    if (!q) return []
    return searchUnifiedLocations(q, 30).map(u => toAppLocation({
      id: u.id,
      name: u.name,
      state: u.state,
      district: u.district,
      type: u.type,
      lat: u.lat,
      lng: u.lng,
      population: u.population,
    }))
  }, [searchQuery])

  // Nationwide search: Open-Meteo's GeoNames-backed geocoder, country-filtered
  // to India, augments the bundled list with cities/towns/villages/postcodes.
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setRemoteResults([])
      setSearchLoading(false)
      setSearchError('')
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const res = await fetch(`/api/weather/locations?q=${encodeURIComponent(q)}&limit=50`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as ApiResponse<LocationSearchResult[]>
        if (!json.ok || !json.data) throw new Error(json.error || 'Location search failed')
        setRemoteResults(json.data.map(toAppLocation))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        // Keep bundled results usable even if remote geocoding is unavailable.
        setRemoteResults([])
        setSearchError('Online India-wide search is temporarily unavailable; bundled locations are still shown.')
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery])

  const searchResults = useMemo(
    () => dedupeLocations([...localSearchResults, ...remoteResults]).slice(0, 50),
    [localSearchResults, remoteResults],
  )

  const selectedState = INDIA_STATES.find(s => s.code === selectedStateCode)
  const selectedDistrict = selectedState?.districts.find(d => d.name === selectedDistrictName)

  const handleUseGps = () => {
    setGpsLoading(true)
    setGpsError('')
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser')
      setGpsPermission('unsupported')
      setGpsLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const nearest = findNearestLocation(latitude, longitude)

        // IMPORTANT: do not snap GPS weather to the nearest bundled city.
        // Use the browser's exact coordinates so current weather is requested
        // for the user's actual position; the nearest place is used only for
        // human-readable state/district context.
        setLocation({
          id: `gps-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
          name: 'My Location',
          state: nearest.state,
          district: nearest.district || nearest.name,
          type: 'city',
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
        })
        setGpsPermission('granted')
        setGpsLoading(false)
        setGpsError(accuracy > 1000 ? `GPS accuracy is about ${Math.round(accuracy)} m; move outdoors for a tighter fix.` : '')
        onOpenChange(false)
      },
      (err) => {
        setGpsError(err.message || 'Permission denied')
        setGpsPermission('denied')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const handlePickLocation = (loc: IndianLocation) => {
    setLocation(loc)
    setSearchQuery('')
    setRemoteResults([])
    setSelectedStateCode('')
    setSelectedDistrictName('')
    onOpenChange(false)
  }

  const locationsForDistrict = useMemo(() => {
    if (!selectedState || !selectedDistrict) return []

    const baseList: IndianLocation[] = [{
      id: `${selectedState.code}-${selectedDistrict.name}-hq`.toLowerCase(),
      name: selectedDistrict.hq,
      state: selectedState.name,
      district: selectedDistrict.name,
      type: 'district_hq',
      lat: selectedDistrict.lat,
      lng: selectedDistrict.lng,
    }]

    const stateCities: IndianLocation[] = citiesInState(selectedState.name).map(c => ({
      id: c.id,
      name: c.name,
      state: c.state,
      district: c.district ?? c.name,
      type: c.type === 'state_capital' || c.type === 'ut_capital' ? 'state_capital' : c.type,
      lat: c.lat,
      lng: c.lng,
      population: c.population,
    }))

    return dedupeLocations([...baseList, ...stateCities])
  }, [selectedState, selectedDistrict])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-orange-500" />
            {t(lang, 'select_location')}
          </DialogTitle>
          <DialogDescription>
            Search Indian cities, towns, villages, districts and postal-code indexed places. Every result includes coordinates and can load weather immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 min-h-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t(lang, 'search_location')}</Label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Globe2 className="h-3 w-3" /> India-wide search
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any Indian place: Chennai, Pollachi, Karaikal, village or PIN code..."
                className="pl-9 pr-9"
              />
              {searchLoading ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-emerald-500" />
              ) : searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {searchQuery.trim().length === 1 && (
              <p className="text-[11px] text-muted-foreground">Type at least 2 characters for India-wide search.</p>
            )}
            {searchError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">{searchError}</p>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <ScrollArea className="h-56 rounded-md border">
                <div className="divide-y">
                  {searchResults.map(loc => (
                    <button
                      key={`${loc.id}-${loc.lat}-${loc.lng}`}
                      onClick={() => handlePickLocation(loc)}
                      className="w-full text-left px-4 py-2 hover:bg-muted/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{loc.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {loc.district ? `${loc.district}, ` : ''}{loc.state}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] capitalize">{loc.type.replace('_', ' ')}</Badge>
                        <span className="text-[9px] text-muted-foreground">{loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && !searchError && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground text-center">
                No matching Indian place found. Try the town/village name, district name, or PIN code.
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground uppercase">or browse manually</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Landmark className="h-3.5 w-3.5" /> {t(lang, 'state')}
              </Label>
              <Select
                value={selectedStateCode}
                onValueChange={(v) => { setSelectedStateCode(v); setSelectedDistrictName('') }}
              >
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIA_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" /> {t(lang, 'district')}
              </Label>
              <Select
                value={selectedDistrictName}
                onValueChange={setSelectedDistrictName}
                disabled={!selectedState}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedState ? 'Select district' : t(lang, 'select_state_first')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {selectedState?.districts.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <TreePine className="h-3.5 w-3.5" /> {t(lang, 'city_town_village')}
              </Label>
              <Select
                value=""
                onValueChange={(v) => {
                  const loc = locationsForDistrict.find(l => l.id === v)
                  if (loc) handlePickLocation(loc)
                }}
                disabled={!selectedDistrict}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDistrict ? 'Select location' : t(lang, 'select_district_first')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {locationsForDistrict.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} <span className="text-xs text-muted-foreground ml-2">({loc.lat.toFixed(3)}, {loc.lng.toFixed(3)})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={handleUseGps} disabled={gpsLoading} variant="outline" className="w-full">
              <Navigation className="h-4 w-4 mr-2" />
              {gpsLoading ? 'Getting exact GPS...' : `${t(lang, 'use_current_location')} (Exact GPS) `}
            </Button>
            {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
            {location && (
              <p className="text-xs text-muted-foreground">
                Currently selected: <span className="font-medium text-foreground">{location.name}, {location.district}, {location.state}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t(lang, 'close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
