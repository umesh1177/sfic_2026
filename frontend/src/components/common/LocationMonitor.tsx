import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, AlertTriangle, Navigation, RefreshCw, CheckCircle2, X } from 'lucide-react';

export interface LiveCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
}

interface LocationMonitorProps {
  roleLabel: 'Citizen' | 'Community Head' | 'Sanitation Worker';
  onLocationUpdate?: (coords: LiveCoordinates) => void;
}

/**
 * Checks location permission & GPS status immediately upon dashboard login
 * and continuously monitors location via watchPosition + Permissions API.
 * Shows a clear prompt/suggestion if location is OFF or denied.
 */
export const LocationMonitor: React.FC<LocationMonitorProps> = ({
  roleLabel,
  onLocationUpdate
}) => {
  const [status, setStatus] = useState<'checking' | 'active' | 'off' | 'denied' | 'unsupported'>('checking');
  const [coords, setCoords] = useState<LiveCoordinates | null>(() => {
    try {
      const cached = sessionStorage.getItem('swachhsetu_live_gps');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [showModalPrompt, setShowModalPrompt] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const publishLocation = useCallback(
    (pos: GeolocationPosition | { coords: { latitude: number; longitude: number; accuracy?: number } }) => {
      const next: LiveCoordinates = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy || 20),
        updatedAt: Date.now()
      };
      lastUpdateRef.current = next.updatedAt;
      setCoords(next);
      setStatus('active');
      setErrorDetail('');
      setShowModalPrompt(false);

      // Persist latest verified GPS for any component/activity to read instantly
      try {
        sessionStorage.setItem('swachhsetu_live_gps', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('swachhsetu-location-update', { detail: next }));
      } catch {
        // ignore storage restrictions
      }
      if (onLocationUpdate) onLocationUpdate(next);
    },
    [onLocationUpdate]
  );

  const applyNavsariDefaultLocation = useCallback(() => {
    const navsariDefault = {
      coords: {
        latitude: 20.9325,
        longitude: 72.9280,
        accuracy: 25
      }
    };
    publishLocation(navsariDefault);
    sessionStorage.setItem('swachhsetu_loc_dismissed', 'true');
    setShowModalPrompt(false);
  }, [publishLocation]);

  const handleGeoError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setStatus('denied');
      setErrorDetail('Location permission is blocked in your browser. Please allow location access in site settings.');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setStatus('off');
      setErrorDetail('Device GPS / Location services appear to be turned OFF or unavailable.');
    } else {
      setStatus('off');
      setErrorDetail('Unable to acquire GPS signal. Please turn ON your device Location or use Navsari default.');
    }
    const dismissed = sessionStorage.getItem('swachhsetu_loc_dismissed');
    if (!dismissed) {
      setShowModalPrompt(true);
    }
  }, []);

  const dismissModal = useCallback(() => {
    sessionStorage.setItem('swachhsetu_loc_dismissed', 'true');
    setShowModalPrompt(false);
  }, []);

  const startMonitoring = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      setErrorDetail('Geolocation is not supported by this browser.');
      const dismissed = sessionStorage.getItem('swachhsetu_loc_dismissed');
      if (!dismissed) setShowModalPrompt(true);
      return;
    }

    setRetrying(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Step 1: Try high accuracy GPS (mobile phone with GPS hardware)
    navigator.geolocation.getCurrentPosition(
      pos => {
        publishLocation(pos);
        setRetrying(false);
      },
      _errHigh => {
        // Step 2: Fallback to standard accuracy (WiFi/IP/Cell network on laptops & desktop browsers)
        navigator.geolocation.getCurrentPosition(
          posLow => {
            publishLocation(posLow);
            setRetrying(false);
          },
          async errFinal => {
            // Step 3: IP Geolocation fallback before marking as failed
            try {
              const res = await fetch('https://freeipapi.com/api/json');
              if (res.ok) {
                const data = await res.json();
                if (data.latitude && data.longitude) {
                  publishLocation({
                    coords: {
                      latitude: Number(data.latitude),
                      longitude: Number(data.longitude),
                      accuracy: 500
                    }
                  });
                  setRetrying(false);
                  return;
                }
              }
            } catch {
              // ignore
            }
            try {
              const res2 = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
              if (res2.ok) {
                const data2 = await res2.json();
                if (data2.latitude && data2.longitude) {
                  publishLocation({
                    coords: {
                      latitude: Number(data2.latitude),
                      longitude: Number(data2.longitude),
                      accuracy: 500
                    }
                  });
                  setRetrying(false);
                  return;
                }
              }
            } catch {
              // ignore
            }

            handleGeoError(errFinal);
            setRetrying(false);
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    // Continuous monitoring during civic activities (with graceful timeout)
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
          publishLocation(pos);
        },
        _err => {
          // Do not interrupt user in background watch
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
      );
    } catch {
      // ignore watch error
    }
  }, [publishLocation, handleGeoError]);

  useEffect(() => {
    // If we already have a cached GPS from earlier in this session, keep it active
    const cached = sessionStorage.getItem('swachhsetu_live_gps');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          setStatus('active');
          setCoords(parsed);
        }
      } catch {
        // ignore
      }
    }

    startMonitoring();

    // Listen to browser permission changes in real time
    let permStatus: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then(res => {
          permStatus = res;
          if (res.state === 'denied') {
            setStatus('denied');
            setErrorDetail('Location permission is denied. Enable Location access to continue civic activities.');
            if (!sessionStorage.getItem('swachhsetu_loc_dismissed')) {
              setShowModalPrompt(true);
            }
          }
          res.onchange = () => {
            if (res.state === 'granted') {
              startMonitoring();
            } else if (res.state === 'denied') {
              setStatus('denied');
              setErrorDetail('Location was turned off. Please enable Location services.');
            }
          };
        })
        .catch(() => {});
    }

    // Periodic heartbeat every 60s - silently syncs without forcing modal popup
    const heartbeat = window.setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        pos => publishLocation(pos),
        () => {
          // Silent background heartbeat failure — never harass user with modal
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }, 60000);

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (permStatus) permStatus.onchange = null;
      window.clearInterval(heartbeat);
    };
  }, [startMonitoring, publishLocation]);

  return (
    <>
      {/* Persistent Top Location Status Strip (Always monitors during every activity) */}
      {(status === 'off' || status === 'denied' || status === 'unsupported') ? (
        <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span className="truncate sm:whitespace-normal">
              Location is OFF — Turn ON GPS/Location for accurate {roleLabel.toLowerCase()} activity tracking &amp; geo-tagged submissions.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={applyNavsariDefaultLocation}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>Use Navsari Center</span>
            </button>
            <button
              type="button"
              onClick={startMonitoring}
              disabled={retrying}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Checking...' : 'Turn On / Retry Location'}</span>
            </button>
          </div>
        </div>
      ) : status === 'active' && coords ? (
        <div className="bg-[#f0faf7] border-b border-[#d1fae5] px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-[#065f46] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Navigation className="w-3 h-3 text-[#095c54]" />
            <span>Live Location Active</span>
            <span className="hidden sm:inline text-slate-500 font-mono font-semibold">
              ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · ±{coords.accuracy}m)
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            <span>GPS Monitored</span>
          </span>
        </div>
      ) : null}

      {/* Startup / Mid-session Location Suggestion Modal when Location is OFF */}
      {showModalPrompt && (status === 'off' || status === 'denied' || status === 'unsupported') && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Enable Location Services</h3>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                    {roleLabel} Dashboard · Live GPS Check
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissModal}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                aria-label="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5 leading-relaxed">
              <p className="font-bold">
                {errorDetail || 'Your device location is currently turned OFF or blocked.'}
              </p>
              <p className="text-[11px] text-amber-800">
                Please switch ON your phone/device GPS and allow browser Location permission so complaints, field attendance, and work evidence are accurately geo-tagged.
              </p>
            </div>

            <ul className="text-[11px] text-slate-600 space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-[10px]">1</span>
                <span>Turn ON <strong>Location / GPS</strong> in your device quick settings.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-[10px]">2</span>
                <span>Tap the lock/site-info icon in the browser address bar and select <strong>Allow Location</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-[10px]">3</span>
                <span>Click <strong>Enable &amp; Verify Location</strong> below or use Navsari default.</span>
              </li>
            </ul>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={applyNavsariDefaultLocation}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
              >
                Use Navsari Center
              </button>
              <button
                type="button"
                onClick={dismissModal}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Remind Me Later
              </button>
              <button
                type="button"
                onClick={startMonitoring}
                disabled={retrying}
                className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <Navigation className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Detecting GPS...' : 'Enable & Verify Location'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
