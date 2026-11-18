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
  const [coords, setCoords] = useState<LiveCoordinates | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [showModalPrompt, setShowModalPrompt] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const publishLocation = useCallback(
    (pos: GeolocationPosition) => {
      const next: LiveCoordinates = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy || 0),
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

  const handleGeoError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setStatus('denied');
      setErrorDetail('Location permission is blocked in your browser. Please allow location access in site settings.');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setStatus('off');
      setErrorDetail('Device GPS / Location services appear to be turned OFF. Please enable Location on your device.');
    } else {
      setStatus('off');
      setErrorDetail('Unable to acquire GPS signal. Please turn ON your device Location and retry.');
    }
    setShowModalPrompt(true);
  }, []);

  const startMonitoring = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      setErrorDetail('Geolocation is not supported by this browser.');
      setShowModalPrompt(true);
      return;
    }

    setRetrying(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Immediate startup check
    navigator.geolocation.getCurrentPosition(
      pos => {
        publishLocation(pos);
        setRetrying(false);
      },
      err => {
        handleGeoError(err);
        setRetrying(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );

    // Continuous monitoring during every activity
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        publishLocation(pos);
      },
      err => {
        handleGeoError(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [publishLocation, handleGeoError]);

  useEffect(() => {
    startMonitoring();

    // Listen to browser permission changes in real time (e.g., if user disables location mid-session)
    let permStatus: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then(res => {
          permStatus = res;
          if (res.state === 'denied') {
            setStatus('denied');
            setErrorDetail('Location permission is denied. Enable Location access to continue civic activities.');
            setShowModalPrompt(true);
          }
          res.onchange = () => {
            if (res.state === 'granted') {
              startMonitoring();
            } else if (res.state === 'denied') {
              setStatus('denied');
              setErrorDetail('Location was turned off. Please enable Location services to continue.');
              setShowModalPrompt(true);
            }
          };
        })
        .catch(() => {});
    }

    // Periodic heartbeat every 45s to detect if GPS was disabled while active
    const heartbeat = window.setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        pos => publishLocation(pos),
        err => handleGeoError(err),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    }, 45000);

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (permStatus) permStatus.onchange = null;
      window.clearInterval(heartbeat);
    };
  }, [startMonitoring, publishLocation, handleGeoError]);

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
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full p-6 space-y-4">
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
                onClick={() => setShowModalPrompt(false)}
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
                <span>Click <strong>Enable &amp; Verify Location</strong> below.</span>
              </li>
            </ul>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalPrompt(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
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
