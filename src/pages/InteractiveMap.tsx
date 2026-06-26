import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Complaint } from '../types';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Filter, 
  AlertCircle, 
  Building, 
  Sparkles, 
  X, 
  ChevronRight, 
  CheckCircle, 
  HelpCircle,
  Locate,
  Navigation,
  Search,
  Route,
  Eye,
  Layers,
  SlidersHorizontal,
  Compass,
  Info,
  RefreshCw,
  Star,
  Flame,
  Milestone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function InteractiveMap({ showToast }: { showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void }) {
  // Render original Google Maps splash screen if key is missing as required by Rule 1C
  if (!hasValidKey) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 text-left">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
          <MapPin className="h-8 w-8 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight">
            Google Maps API Key Required
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-450 leading-relaxed max-w-md mx-auto">
            Interactive mapping requires a valid Google Maps Platform API key loaded in the workspace settings.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/60 dark:border-neutral-800/65 p-6 text-left space-y-4 shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-black text-neutral-400 dark:text-neutral-500 block">STEP 1: GET YOUR KEY</span>
            <a
              href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline block"
            >
              Get a key from the Google Cloud Console &rarr;
            </a>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-neutral-400 dark:text-neutral-500 block">STEP 2: ADD TO AI STUDIO SECRETS</span>
            <ul className="text-xs text-neutral-600 dark:text-neutral-350 list-decimal list-inside space-y-1.5 leading-relaxed font-medium">
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right corner of the window)</li>
              <li>Select <strong>Secrets</strong> option</li>
              <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as secret name, press Enter</li>
              <li>Paste your API key string, press Enter</li>
            </ul>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 dark:text-neutral-550 font-bold">
          The app compiles and mounts automatically upon adding your key.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <InteractiveMapInner showToast={showToast} />
    </APIProvider>
  );
}

function InteractiveMapInner({ showToast }: { showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePulse, setLivePulse] = useState(false);

  // Map Filter State
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Map Control states
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [visualMode, setVisualMode] = useState<'pins' | 'clusters' | 'heatmap'>('pins');
  const [zoom, setZoom] = useState(12);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // defaults to SF, updates to first complaint

  // Current location / Proximity state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // in kilometers

  // Active Complaint selection
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);

  // Search Address Location
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [searchAddress, setSearchAddress] = useState('');

  // Reverse geocoding / Click coordinate inspection Mode
  const [inspectMode, setInspectMode] = useState(false);
  const [inspectCoords, setInspectCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [inspectAddress, setInspectAddress] = useState('');

  // Routing State
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Street View State
  const [showStreetView, setShowStreetView] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Complaint[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setComplaints(data);
      setLoading(false);
      
      // Trigger a nice live update pulse
      setLivePulse(true);
      const timer = setTimeout(() => setLivePulse(false), 2000);

      // Automatically center map on the first complaint if available on initial load
      if (data.length > 0 && mapCenter.lat === 37.7749 && mapCenter.lng === -122.4194) {
        setMapCenter({ lat: data[0].latitude, lng: data[0].longitude });
      }

      return () => clearTimeout(timer);
    }, (error) => {
      console.error('Error fetching complaints:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mapCenter]);

  // Handle locating the user
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      if (showToast) showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setMapCenter(coords);
        setZoom(14);
        setLocating(false);
        if (showToast) showToast('Acquired your current location coordinate', 'success');
      },
      (error) => {
        console.error('GPS locate error:', error);
        setLocating(false);
        if (showToast) showToast('Could not acquire your location. Check browser settings.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Haversine Distance Formula
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const departments = ['All', 'Sanitation', 'Roads & Traffic', 'Water Supply', 'Public Safety', 'Health', 'Environment', 'Others'];
  const severities = ['All', '1', '2', '3', '4', '5'];
  const statuses = ['All', 'pending', 'in-progress', 'resolved', 'rejected'];

  const filteredComplaints = complaints.filter((c) => {
    const matchesDept = selectedDept === 'All' || c.department === selectedDept;
    const matchesSeverity = selectedSeverity === 'All' || c.severity.toString() === selectedSeverity;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
    
    let matchesDistance = true;
    if (userLocation && maxDistance !== null) {
      const dist = getDistance(userLocation.lat, userLocation.lng, c.latitude, c.longitude);
      matchesDistance = dist <= maxDistance;
    }
    
    return matchesDept && matchesSeverity && matchesStatus && matchesDistance;
  });

  // Pure deterministic JS marker clustering based on zoom levels
  const getClusters = (list: Complaint[], zoomLevel: number) => {
    if (zoomLevel >= 15) {
      return list.map((c) => ({ isCluster: false, complaint: c, key: `item-${c.id}`, latitude: c.latitude, longitude: c.longitude }));
    }

    // Radius scaling based on Google zoom levels
    const threshold = 0.16 / Math.pow(1.95, zoomLevel - 8);
    const clusters: any[] = [];
    const processed = new Set<string>();

    for (const c of list) {
      if (processed.has(c.id)) continue;

      const clusterItems: Complaint[] = [c];
      processed.add(c.id);

      for (const other of list) {
        if (processed.has(other.id)) continue;

        const latDiff = Math.abs(c.latitude - other.latitude);
        const lngDiff = Math.abs(c.longitude - other.longitude);

        if (latDiff < threshold && lngDiff < threshold) {
          clusterItems.push(other);
          processed.add(other.id);
        }
      }

      if (clusterItems.length > 1) {
        const latSum = clusterItems.reduce((sum, item) => sum + item.latitude, 0);
        const lngSum = clusterItems.reduce((sum, item) => sum + item.longitude, 0);
        clusters.push({
          isCluster: true,
          id: `cluster-${c.id}`,
          latitude: latSum / clusterItems.length,
          longitude: lngSum / clusterItems.length,
          count: clusterItems.length,
          items: clusterItems,
          key: `cluster-${c.id}-${clusterItems.length}`
        });
      } else {
        clusters.push({
          isCluster: false,
          complaint: c,
          latitude: c.latitude,
          longitude: c.longitude,
          key: `item-${c.id}`
        });
      }
    }
    return clusters;
  };

  const mapClusters = getClusters(filteredComplaints, zoom);

  // Search Address lookup using Geocoding SDK
  const handleSearchLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !geocodingLib || !map) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        setMapCenter(coords);
        setZoom(15);
        setSearchMarker(coords);
        setSearchAddress(results[0].formatted_address);
        if (showToast) showToast(`Centered on: ${results[0].formatted_address}`, 'success');
      } else {
        if (showToast) showToast('Could not find location. Try a more specific term.', 'warning');
      }
    });
  };

  // Reverse Geocoding Map Clicks
  const handleMapClick = (e: any) => {
    if (!inspectMode || !geocodingLib) return;
    const lat = e.detail.latLng?.lat;
    const lng = e.detail.latLng?.lng;
    if (lat !== undefined && lng !== undefined) {
      const coords = { lat, lng };
      setInspectCoords(coords);
      setInspectAddress('Reverse geocoding address...');

      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setInspectAddress(results[0].formatted_address);
          if (showToast) showToast('Dropped custom inspection pin!', 'info');
        } else {
          setInspectAddress(`Coordinate: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      });
    }
  };

  // Active Routing using computedRoutes Polylines
  const handleRouteTo = (c: Complaint) => {
    if (!userLocation) {
      if (showToast) showToast('Please click "Locate Me" to get your starting point first!', 'info');
      return;
    }
    if (!routesLib || !map) {
      if (showToast) showToast('Routes library loading...', 'info');
      return;
    }

    // Clear old lines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin: { lat: userLocation.lat, lng: userLocation.lng },
      destination: { lat: c.latitude, lng: c.longitude },
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
      .then(({ routes }) => {
        if (routes?.[0]) {
          const newPolylines = routes[0].createPolylines();
          newPolylines.forEach((p) => {
            p.setMap(map);
            p.setOptions({
              strokeColor: '#3b82f6',
              strokeOpacity: 0.85,
              strokeWeight: 6,
            });
          });
          polylinesRef.current = newPolylines;

          const distanceKm = (routes[0].distanceMeters / 1000).toFixed(1);
          const durationMins = Math.round(routes[0].durationMillis / 60000);
          setRouteInfo({
            distance: `${distanceKm} km`,
            duration: `${durationMins} mins`,
          });

          if (routes[0].viewport) {
            map.fitBounds(routes[0].viewport);
          }
          if (showToast) showToast(`Route drawn! Distance: ${distanceKm} km`, 'success');
        } else {
          if (showToast) showToast('No vehicle routes found between positions', 'warning');
        }
      })
      .catch((err) => {
        console.error('Routes computing failed:', err);
        if (showToast) showToast('Could not calculate driving route directions.', 'warning');
      });
  };

  const clearRoute = () => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setRouteInfo(null);
    if (showToast) showToast('Calculated routes cleared.', 'info');
  };

  // Auto zoom bounds to fit all filtered active complaints
  const fitAllMarkers = () => {
    if (filteredComplaints.length === 0 || !map) {
      if (showToast) showToast('No filtered complaints to fit inside view', 'info');
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    filteredComplaints.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
    map.fitBounds(bounds);
    if (showToast) showToast('Auto-zoomed to fit all active markers', 'success');
  };

  // Street view pane updates
  useEffect(() => {
    if (showStreetView && activeComplaintId && document.getElementById('street-view-pano')) {
      const activeC = complaints.find((x) => x.id === activeComplaintId);
      if (activeC) {
        try {
          new google.maps.StreetViewPanorama(
            document.getElementById('street-view-pano') as HTMLElement,
            {
              position: { lat: activeC.latitude, lng: activeC.longitude },
              pov: { heading: 180, pitch: 0 },
              zoom: 1,
              visible: true,
            }
          );
        } catch (err) {
          console.error('Street View Panorama error:', err);
        }
      }
    }
  }, [showStreetView, activeComplaintId, complaints]);

  const activeComplaint = complaints.find((c) => c.id === activeComplaintId);

  const getSeverityPinColor = (severity: number) => {
    if (severity === 5) return { pin: '#ef4444', text: 'Critical' };
    if (severity === 4) return { pin: '#f97316', text: 'High' };
    if (severity === 3) return { pin: '#eab308', text: 'Moderate' };
    return { pin: '#10b981', text: 'Low' };
  };

  const handleFocusComplaint = (c: Complaint) => {
    setMapCenter({ lat: c.latitude, lng: c.longitude });
    setZoom(16);
    setActiveComplaintId(c.id);
    setShowStreetView(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden text-left bg-neutral-50 dark:bg-neutral-950">
      
      {/* SIDEBAR GRID */}
      <div className="w-full lg:w-100 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 h-[45vh] lg:h-full overflow-hidden shadow-xs">
        
        {/* Real-time Connection Indicator Header */}
        <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-250/20 flex justify-between items-center text-xs font-black text-neutral-500">
          <div className="flex items-center gap-1.5 uppercase tracking-wider">
            <span className={`h-2 w-2 rounded-full ${livePulse ? 'bg-blue-500 animate-ping' : 'bg-green-500'} shrink-0`} />
            Real-Time Dispatch Feed
          </div>
          <span className="bg-neutral-200 dark:bg-neutral-850 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full">
            {filteredComplaints.length} reports
          </span>
        </div>

        {/* Search location bar */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-850 space-y-3">
          <form onSubmit={handleSearchLocation} className="relative">
            <input
              type="text"
              placeholder="Search address / town center..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-8 py-2.5 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:border-blue-500"
            />
            <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-3" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Map Filters & Controls Row */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-[11px] font-bold bg-neutral-150/40 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 rounded-lg p-2 focus:outline-hidden text-neutral-700 dark:text-neutral-200 cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d} value={d} className="bg-white dark:bg-neutral-900">Sector: {d}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-[11px] font-bold bg-neutral-150/40 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 rounded-lg p-2 focus:outline-hidden text-neutral-700 dark:text-neutral-200 cursor-pointer"
              >
                {severities.map((s) => (
                  <option key={s} value={s} className="bg-white dark:bg-neutral-900">{s === 'All' ? 'All Severities' : `Severity: ${s}`}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-[11px] font-bold bg-neutral-150/40 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 rounded-lg p-2 focus:outline-hidden text-neutral-700 dark:text-neutral-200 cursor-pointer"
              >
                {statuses.map((st) => (
                  <option key={st} value={st} className="bg-white dark:bg-neutral-900">{st === 'All' ? 'All Statuses' : `Status: ${st}`}</option>
                ))}
              </select>
            </div>

            {/* Proximity Slider Trigger (Locate Me) */}
            <div className="bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-150 dark:border-neutral-850 space-y-2">
              <div className="flex justify-between items-center gap-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-neutral-500 uppercase">
                  <Locate className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                  My Proximity Radius
                </div>
                {userLocation ? (
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-100/50 dark:border-blue-900/30">
                    GPS Connected
                  </span>
                ) : (
                  <button
                    onClick={handleLocateMe}
                    disabled={locating}
                    className="text-[9px] font-black text-blue-600 dark:text-blue-450 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {locating ? 'Acquiring GPS...' : 'Locate Me'}
                  </button>
                )}
              </div>

              {userLocation && (
                <div className="space-y-1 pt-1.5 border-t border-neutral-150/50 dark:border-neutral-850/50">
                  <div className="flex justify-between text-[10px] font-bold text-neutral-500">
                    <span>Show issues within:</span>
                    <span className="font-black text-neutral-800 dark:text-neutral-200">
                      {maxDistance === null ? 'All Distances' : `${maxDistance} km`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={maxDistance || 50}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setMaxDistance(val === 50 ? null : val);
                      }}
                      className="w-full accent-blue-600 cursor-pointer h-1 bg-neutral-200 dark:bg-neutral-850 rounded-lg"
                    />
                    <button
                      onClick={() => setMaxDistance(null)}
                      className="text-[9px] font-black text-neutral-400 hover:text-neutral-600 dark:text-neutral-500"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="flex-grow overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-850">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-neutral-50 dark:bg-neutral-950 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
              <p className="text-xs font-black text-neutral-500 dark:text-neutral-400">No matching reports found</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Modify filters or proximity sliders to load nearby pins.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/40">
              {filteredComplaints.map((c) => {
                const style = getSeverityPinColor(c.severity);
                const isSelected = activeComplaintId === c.id;
                
                // Calculate distance if GPS is set
                const distanceVal = userLocation 
                  ? getDistance(userLocation.lat, userLocation.lng, c.latitude, c.longitude).toFixed(1) 
                  : null;

                return (
                  <div
                    key={c.id}
                    className={`p-4 transition-all border-l-4 text-left ${
                      isSelected 
                        ? 'bg-blue-50/50 dark:bg-blue-950/15 border-blue-600' 
                        : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-950/20'
                    }`}
                  >
                    <button
                      onClick={() => handleFocusComplaint(c)}
                      className="w-full text-left flex items-start gap-3 cursor-pointer focus:outline-hidden"
                    >
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0 mt-1 border-2 border-white dark:border-neutral-900 shadow-xs"
                        style={{ backgroundColor: style.pin }}
                      />
                      <div className="space-y-0.5 flex-grow min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-black text-neutral-950 dark:text-neutral-50 truncate font-display">
                            {c.title}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0 mt-0.5" />
                        </div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate leading-snug">{c.address}</p>
                        
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                          <span className="text-[8px] font-black uppercase text-neutral-400 dark:text-neutral-500">
                            {c.department}
                          </span>
                          <span className="text-[8px] text-neutral-350 dark:text-neutral-600">•</span>
                          <span className="text-[8px] font-black text-neutral-500 dark:text-neutral-400">
                            SEV: {c.severity}/5
                          </span>
                          {distanceVal && (
                            <>
                              <span className="text-[8px] text-neutral-350 dark:text-neutral-600">•</span>
                              <span className="text-[8px] font-black text-blue-600 dark:text-blue-400">
                                {distanceVal} km away
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expandable Inner detail block for focused item */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3.5 pt-3.5 border-t border-neutral-150 dark:border-neutral-850/80 space-y-3"
                      >
                        <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed font-medium">
                          {c.description}
                        </p>

                        {/* Image Preview */}
                        {c.images && c.images.length > 0 && (
                          <img
                            src={c.images[0]}
                            alt="Incident Evidence"
                            referrerPolicy="no-referrer"
                            className="h-28 w-full object-cover rounded-xl border border-neutral-150 dark:border-neutral-800"
                          />
                        )}

                        {/* AI Summary / Recommendations */}
                        {c.recommendedAction && (
                          <div className="bg-blue-50/40 dark:bg-neutral-950/70 p-3 rounded-xl border border-blue-100/50 dark:border-blue-900/30 text-[11px] text-neutral-750 dark:text-neutral-300">
                            <span className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-450 block mb-1">Recommended dispatch plan</span>
                            {c.recommendedAction}
                          </div>
                        )}

                        {/* Interactive action controls */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {userLocation && (
                            <button
                              onClick={() => handleRouteTo(c)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Route className="h-3.5 w-3.5" />
                              Get Route Directions
                            </button>
                          )}
                          <button
                            onClick={() => setShowStreetView(!showStreetView)}
                            className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 text-[10px] font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            {showStreetView ? 'Hide Street View' : 'Live Street View'}
                          </button>
                        </div>

                        {/* Street View container inside list pane */}
                        {showStreetView && (
                          <div className="space-y-1.5">
                            <div className="text-[9px] uppercase font-black text-neutral-400">Street-Level Panorama Lookup</div>
                            <div
                              id="street-view-pano"
                              className="w-full h-44 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-100 dark:bg-neutral-950"
                            />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DYNAMIC MAP AREA */}
      <div className="flex-grow h-full relative">
        <Map
          center={mapCenter}
          zoom={zoom}
          onCenterChanged={(e) => {
            if (e.detail.center) setMapCenter(e.detail.center);
          }}
          onZoomChanged={(e) => {
            if (e.detail.zoom) setZoom(e.detail.zoom);
          }}
          mapId="DEMO_MAP_ID"
          mapTypeId={mapTypeId}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="cooperative"
          onClick={handleMapClick}
        >
          {/* USER LOCATION BLUE DOT MARKER */}
          {userLocation && (
            <AdvancedMarker position={userLocation} title="Your Current Location">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-6 w-6 rounded-full bg-blue-500/35 animate-ping" />
                <div className="h-4.5 w-4.5 rounded-full bg-blue-600 border-3 border-white shadow-md relative z-10" />
              </div>
            </AdvancedMarker>
          )}

          {/* SEARCH LOCATION PIN */}
          {searchMarker && (
            <AdvancedMarker position={searchMarker}>
              <div className="relative flex flex-col items-center select-none cursor-pointer">
                <div className="bg-amber-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg animate-bounce">
                  <Star className="h-4.5 w-4.5 fill-white" />
                </div>
                <div className="bg-neutral-900/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md mt-1 max-w-[120px] truncate">
                  Searched location
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* REVERSE LOOKUP CLICK INSPECTOR PIN */}
          {inspectCoords && (
            <AdvancedMarker position={inspectCoords} onClick={() => setInspectCoords(null)}>
              <div className="relative flex flex-col items-center">
                <div className="bg-emerald-600 text-white p-1.5 rounded-full border-2 border-white shadow-lg">
                  <Compass className="h-4.5 w-4.5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="bg-emerald-950/95 border border-emerald-800 text-white p-2.5 rounded-xl shadow-lg mt-1.5 text-[10px] font-bold max-w-[180px] leading-relaxed text-left">
                  <div className="text-[8px] uppercase tracking-wider text-emerald-400 font-black mb-0.5">Click Inspector Coordinate</div>
                  <div>{inspectAddress}</div>
                  <div className="text-[7px] text-neutral-400 mt-1 italic">Click pin to close inspector</div>
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* RENDER COMPLAINTS (PINS VS CLUSTERS VS HEATMAPS) */}
          {visualMode === 'pins' && (
            filteredComplaints.map((c) => {
              const style = getSeverityPinColor(c.severity);
              const isActive = activeComplaintId === c.id;
              return (
                <AdvancedMarker
                  key={c.id}
                  position={{ lat: c.latitude, lng: c.longitude }}
                  onClick={() => {
                    setActiveComplaintId(c.id);
                    setShowStreetView(false);
                  }}
                >
                  <Pin 
                    background={style.pin} 
                    glyphColor="#fff" 
                    scale={isActive ? 1.25 : 1.05} 
                    borderColor={isActive ? '#000000' : '#ffffff'}
                  />
                </AdvancedMarker>
              );
            })
          )}

          {visualMode === 'clusters' && (
            mapClusters.map((cluster) => {
              if (cluster.isCluster) {
                // Return a clustered indicator marker
                const itemsCount = cluster.count;
                // Determine color based on density sizes
                const colorClass = itemsCount >= 10 ? 'bg-rose-650' : itemsCount >= 5 ? 'bg-orange-550' : 'bg-blue-600';
                return (
                  <AdvancedMarker
                    key={cluster.key}
                    position={{ lat: cluster.latitude, lng: cluster.longitude }}
                    onClick={() => {
                      setMapCenter({ lat: cluster.latitude, lng: cluster.longitude });
                      setZoom((prev) => Math.min(18, prev + 2));
                      if (showToast) showToast(`Zooming into cluster: ${itemsCount} incidents`, 'info');
                    }}
                  >
                    <div className={`h-10 w-10 rounded-full ${colorClass} text-white font-black text-xs flex items-center justify-center border-3 border-white shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all animate-fade-in`}>
                      {itemsCount}
                    </div>
                  </AdvancedMarker>
                );
              } else {
                // Render singular pin inside cluster mode
                const c = cluster.complaint;
                const style = getSeverityPinColor(c.severity);
                return (
                  <AdvancedMarker
                    key={cluster.key}
                    position={{ lat: c.latitude, lng: c.longitude }}
                    onClick={() => {
                      setActiveComplaintId(c.id);
                      setShowStreetView(false);
                    }}
                  >
                    <Pin background={style.pin} glyphColor="#fff" scale={1.05} />
                  </AdvancedMarker>
                );
              }
            })
          )}

          {visualMode === 'heatmap' && (
            filteredComplaints.map((c) => (
              <AdvancedMarker
                key={`heatmap-${c.id}`}
                position={{ lat: c.latitude, lng: c.longitude }}
                zIndex={1}
              >
                <div className="relative flex items-center justify-center select-none pointer-events-none">
                  {/* Outer glow ring blending layer */}
                  <div
                    className="rounded-full shrink-0 blur-md opacity-75"
                    style={{
                      width: `${Math.max(60, zoom * 8.5)}px`,
                      height: `${Math.max(60, zoom * 8.5)}px`,
                      background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(239, 68, 68, 0) 70%)',
                    }}
                  />
                  {/* Pinpoint center highlight */}
                  <div className="absolute h-2 w-2 rounded-full bg-red-600 border border-white" />
                </div>
              </AdvancedMarker>
            ))
          )}

          {/* ACTIVE COMPLAINT INFO WINDOW */}
          {activeComplaintId && activeComplaint && (
            <InfoWindow
              position={{ lat: activeComplaint.latitude, lng: activeComplaint.longitude }}
              onCloseClick={() => {
                setActiveComplaintId(null);
                setShowStreetView(false);
              }}
            >
              <div className="p-2.5 space-y-2.5 max-w-[240px] text-left">
                <div className="flex items-center justify-between gap-1.5 border-b border-neutral-100 pb-1.5">
                  <strong className="text-xs font-extrabold text-neutral-900 font-display block leading-tight">{activeComplaint.title}</strong>
                  <span className="bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-sm border border-blue-100">
                    {activeComplaint.department}
                  </span>
                </div>

                <p className="text-[10px] text-neutral-600 leading-relaxed font-semibold line-clamp-3">{activeComplaint.description}</p>
                
                {/* Status and SLA bar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm border uppercase tracking-wider ${
                    activeComplaint.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    activeComplaint.status === 'in-progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {activeComplaint.status}
                  </span>
                  <span className="bg-neutral-150 text-neutral-800 border border-neutral-200 text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                    Severity: {activeComplaint.severity}/5
                  </span>
                </div>

                {activeComplaint.images && activeComplaint.images.length > 0 && (
                  <div className="pt-1.5 border-t border-neutral-100">
                    <img
                      src={activeComplaint.images[0]}
                      alt="Evidence"
                      referrerPolicy="no-referrer"
                      className="h-16 w-full object-cover rounded-md"
                    />
                  </div>
                )}

                <span className="text-[8px] text-neutral-450 block pt-1 italic truncate">{activeComplaint.address}</span>
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* BOTTOM FLOATING CONTROLS PANEL */}
        <div className="absolute bottom-5 right-5 left-5 md:left-auto md:w-96 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/50 dark:border-neutral-800/60 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3 z-10 animate-fade-in text-xs font-bold text-neutral-700 dark:text-neutral-200">
          
          {/* Active Navigation Polyline Summary HUD */}
          {routeInfo && (
            <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-100/50 dark:border-blue-900/30 flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <Milestone className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-black text-neutral-400 block tracking-wider">Estimated Driving route</span>
                  <span className="font-black text-neutral-800 dark:text-neutral-200">
                    {routeInfo.distance} ({routeInfo.duration})
                  </span>
                </div>
              </div>
              <button
                onClick={clearRoute}
                className="text-[9px] font-black text-rose-600 hover:underline px-2 py-1 rounded-lg hover:bg-rose-50/50 dark:hover:bg-rose-950/35 cursor-pointer"
              >
                Clear Route
              </button>
            </div>
          )}

          {/* Map display controls */}
          <div className="space-y-2">
            <span className="text-neutral-400 dark:text-neutral-500 text-[9px] font-black uppercase tracking-wider block">Map Mode Viewport</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['roadmap', 'satellite', 'hybrid', 'terrain'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMapTypeId(mode)}
                  className={`text-[9px] uppercase font-black py-1.5 rounded-lg border cursor-pointer transition-all ${
                    mapTypeId === mode
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                      : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200/50 dark:border-neutral-850 hover:bg-neutral-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Presentation Layers (Pins vs Clusters vs Heatmaps) */}
          <div className="space-y-2 pt-1 border-t border-neutral-150/50 dark:border-neutral-850/50">
            <span className="text-neutral-400 dark:text-neutral-500 text-[9px] font-black uppercase tracking-wider block">Visual Representation Style</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setVisualMode('pins')}
                className={`py-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  visualMode === 'pins'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200/50 dark:border-neutral-850 hover:bg-neutral-150/40 dark:hover:bg-neutral-850'
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span className="text-[9px] uppercase font-black">Pins</span>
              </button>
              <button
                onClick={() => setVisualMode('clusters')}
                className={`py-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  visualMode === 'clusters'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200/50 dark:border-neutral-850 hover:bg-neutral-150/40 dark:hover:bg-neutral-850'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span className="text-[9px] uppercase font-black">Clusters</span>
              </button>
              <button
                onClick={() => setVisualMode('heatmap')}
                className={`py-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  visualMode === 'heatmap'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200/50 dark:border-neutral-850 hover:bg-neutral-150/40 dark:hover:bg-neutral-850'
                }`}
              >
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-[9px] uppercase font-black">Heatmap</span>
              </button>
            </div>
          </div>

          {/* Interactive Utility Commands row */}
          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-neutral-150/50 dark:border-neutral-850/50">
            <button
              onClick={fitAllMarkers}
              className="text-[9px] uppercase font-black py-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 hover:scale-101 cursor-pointer flex items-center justify-center gap-1 text-neutral-800 dark:text-neutral-100"
            >
              <Navigation className="h-3.5 w-3.5 rotate-45 text-blue-500" />
              Fit All Pins
            </button>
            <button
              onClick={() => {
                setInspectMode(!inspectMode);
                if (!inspectMode) {
                  if (showToast) showToast('Inspection mode active! Click anywhere on the map to find address.', 'info');
                } else {
                  setInspectCoords(null);
                }
              }}
              className={`text-[9px] uppercase font-black py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                inspectMode 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                  : 'bg-neutral-100 dark:bg-neutral-850 border-neutral-200/50 dark:border-neutral-850 hover:bg-neutral-200'
              }`}
            >
              <Compass className={`h-3.5 w-3.5 ${inspectMode ? 'animate-spin text-white' : 'text-emerald-500'}`} style={{ animationDuration: '6s' }} />
              Inspect Clicks
            </button>
          </div>
        </div>

        {/* Legend Indicator Overlay */}
        <div className="absolute bottom-5 left-5 hidden md:block bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/50 dark:border-neutral-800/60 rounded-2xl p-4 shadow-lg backdrop-blur-md space-y-2 text-[10px] font-black text-neutral-700 dark:text-neutral-200 z-10">
          <span className="text-neutral-400 dark:text-neutral-500 text-[9px] uppercase tracking-wider block mb-1">Incident Severities</span>
          <div className="flex items-center gap-2.5">
            <div className="h-3.5 w-3.5 rounded-full bg-[#ef4444] border-2 border-white dark:border-neutral-800 shadow-xs" />
            <span>Red (Level 5) - Critical Hazard</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-3.5 w-3.5 rounded-full bg-[#f97316] border-2 border-white dark:border-neutral-800 shadow-xs" />
            <span>Orange (Level 4) - Significant</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-3.5 w-3.5 rounded-full bg-[#eab308] border-2 border-white dark:border-neutral-800 shadow-xs" />
            <span>Yellow (Level 3) - Moderate Issue</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-3.5 w-3.5 rounded-full bg-[#10b981] border-2 border-white dark:border-neutral-800 shadow-xs" />
            <span>Green (Level 1-2) - Cosmetic/Low</span>
          </div>
        </div>
      </div>

    </div>
  );
}
