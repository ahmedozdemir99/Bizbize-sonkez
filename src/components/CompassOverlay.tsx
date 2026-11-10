import React, { useState, useEffect } from 'react';
import { Compass, ShieldAlert } from 'lucide-react';

export const CompassOverlay: React.FC = () => {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestOrientationPermission = async () => {
    setPermissionRequested(true);
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          setErrorMsg(null);
        } else {
          setErrorMsg('Pusula izni reddedildi.');
        }
      } catch (err: any) {
        setErrorMsg('Pusula izni alınamadı: ' + (err?.message || ''));
      }
    } else {
      // Android / standard browsers
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    let alpha: number | null = null;
    if ((event as any).webkitCompassHeading !== undefined && (event as any).webkitCompassHeading !== null) {
      // iOS webkitCompassHeading (0-360, 0 is North)
      alpha = (event as any).webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android / Standard alpha (0-360 counter-clockwise from North)
      alpha = 360 - event.alpha;
    }

    if (alpha !== null && !isNaN(alpha)) {
      setHeading(Math.round(alpha));
    }
  };

  useEffect(() => {
    // Try auto-attaching if permission not explicitly required (Android / Chrome)
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission !== 'function'
    ) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  const getCardinalDirection = (deg: number) => {
    const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
    const index = Math.round((deg % 360) / 45);
    return directions[index % 8];
  };

  return (
    <div className="absolute top-14 right-3 z-30 flex flex-col items-end gap-1 pointer-events-auto">
      {heading !== null ? (
        <div className="bg-zinc-950/90 border border-orange-500/50 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-white font-mono animate-in fade-in">
          {/* Rotating Compass Needle Dial */}
          <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-inner">
            <div 
              className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <div className="w-1 h-5 bg-gradient-to-t from-orange-500 to-red-500 rounded-full -translate-y-1" />
            </div>
            <Compass className="w-5 h-5 text-orange-400 opacity-30 absolute" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-orange-400">{heading}°</span>
              <span className="text-[10px] font-bold px-1 rounded bg-orange-500/20 text-orange-300">
                {getCardinalDirection(heading)}
              </span>
            </div>
            <span className="text-[9px] text-zinc-400 uppercase tracking-tight">Kortej Yönü Pusulası</span>
          </div>
        </div>
      ) : !permissionRequested && typeof window !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function' ? (
        <button
          onClick={requestOrientationPermission}
          className="bg-zinc-950/90 hover:bg-zinc-900 border border-orange-500/40 text-orange-400 hover:text-orange-300 px-3 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold transition biker-btn"
          title="iOS Pusula Sensörünü Etkinleştir"
        >
          <Compass className="w-4 h-4 animate-spin-slow" />
          <span>Pusulayı Aç (iOS)</span>
        </button>
      ) : (
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <Compass className="w-3.5 h-3.5 text-orange-400" />
          <span>Pusula Kalibre Ediliyor...</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-500/50 rounded-xl px-2 py-1 text-[10px] text-red-300 max-w-[180px] text-right">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
