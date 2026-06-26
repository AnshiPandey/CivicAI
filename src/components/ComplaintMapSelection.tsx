import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface ComplaintMapSelectionProps {
  location: LocationData;
  onChange: (loc: LocationData) => void;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Inner component to capture Map clicks using @vis.gl/react-google-maps
function MapEventsHandler({ onMapClick }: { onMapClick: (e: google.maps.MapMouseEvent) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      onMapClick(e);
    });
    
    return () => {
      listener.remove();
    };
  }, [map, onMapClick]);

  return null;
}

export default function ComplaintMapSelection({ location, onChange }: ComplaintMapSelectionProps) {
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // default SF
  const [zoom, setZoom] = useState(12);
  const [geocoding, setGeocoding] = useState(false);

  // Auto-detect current location
  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter({ lat, lng });
        setZoom(16);
        
        // Fetch readable address using reverse geocoding
        reverseGeocode(lat, lng);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Could not retrieve GPS coordinates. Please select manually on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reverse geocode lat,lng to formatted address using free Nominatim OpenStreetMap API to bypass backend CORS
  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CivicAI-Application-Vite'
        }
      });
      const data = await response.json();
      const addressStr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onChange({
        latitude: lat,
        longitude: lng,
        address: addressStr
      });
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      // Fallback to simple coordinates
      onChange({
        latitude: lat,
        longitude: lng,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      reverseGeocode(lat, lng);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <label className="text-sm font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <MapPin className="h-4.5 w-4.5 text-blue-500" />
            Complaint Incident Location
          </label>
          <p className="text-xs text-neutral-450 dark:text-neutral-450 mt-0.5">Select the physical spot of the report on the map</p>
        </div>
        <button
          type="button"
          onClick={handleAutoDetect}
          className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-650 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all hover:scale-102"
          id="btn-auto-detect"
        >
          <Navigation className="h-3.5 w-3.5 animate-pulse" />
          Auto-Detect GPS
        </button>
      </div>

      {hasValidKey ? (
        <div className="w-full h-80 rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-800/60 shadow-xs relative">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              center={{ lat: location.latitude, lng: location.longitude }}
              zoom={zoom}
              onCenterChanged={(e) => {
                if (e.detail.center) {
                  setMapCenter(e.detail.center);
                }
              }}
              onZoomChanged={(e) => {
                if (e.detail.zoom) {
                  setZoom(e.detail.zoom);
                }
              }}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              gestureHandling="cooperative"
            >
              <AdvancedMarker position={{ lat: location.latitude, lng: location.longitude }}>
                <Pin background="#3b82f6" glyphColor="#fff" borderColor="#1d4ed8" />
              </AdvancedMarker>
              <MapEventsHandler onMapClick={handleMapClick} />
            </Map>
          </APIProvider>
          {geocoding && (
            <div className="absolute inset-0 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center">
              <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 animate-pulse">Reverse lookup in progress...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200">Interactive Map Selector Offline</h4>
              <p className="text-xs text-neutral-450 dark:text-neutral-400 leading-relaxed">
                Google Maps Platform key is not configured in Secrets. Enter coordinates manually below or configure the <code>GOOGLE_MAPS_PLATFORM_KEY</code> parameter.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-neutral-600 dark:text-neutral-450 block mb-1.5">Latitude</label>
              <input
                type="number"
                step="any"
                value={location.latitude}
                onChange={(e) => onChange({ ...location, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-neutral-800 dark:text-neutral-100"
                placeholder="e.g. 37.7749"
                id="input-lat"
              />
            </div>
            <div>
              <label className="text-xs font-black text-neutral-600 dark:text-neutral-450 block mb-1.5">Longitude</label>
              <input
                type="number"
                step="any"
                value={location.longitude}
                onChange={(e) => onChange({ ...location, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-neutral-800 dark:text-neutral-100"
                placeholder="e.g. -122.4194"
                id="input-lng"
              />
            </div>
          </div>
        </div>
      )}

      {/* Address Text Bar */}
      <div>
        <label className="text-xs font-black text-neutral-650 dark:text-neutral-400 block mb-1.5">Full Descriptive Address / Landmark Reference</label>
        <textarea
          value={location.address}
          onChange={(e) => onChange({ ...location, address: e.target.value })}
          rows={2}
          className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-neutral-800 dark:text-neutral-100 placeholder-neutral-400"
          placeholder="e.g. 455 Golden Gate Ave, or 'Near public garden main fountain'"
          required
          id="input-address"
        />
      </div>
    </div>
  );
}
