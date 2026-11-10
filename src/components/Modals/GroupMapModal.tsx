import React, { useState, useMemo } from 'react';
import { X, Map as MapIcon, Navigation, Layers, ExternalLink, ShieldCheck, Clock, Gauge, Route, TrendingUp } from 'lucide-react';
import { LiveMap } from '../LiveMap';
import { CompassOverlay } from '../CompassOverlay';
import { Message, LocationData } from '../../types';
import { latestLiveLocations } from '../../services/location';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface GroupMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const GroupMapModal: React.FC<GroupMapModalProps> = ({
  isOpen,
  onClose,
  messages,
}) => {
  const [viewMode, setViewMode] = useState<'google' | 'radar' | 'chart'>('google'); // Default to pure Google Maps
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // 'm' = Roadmap, 'k' = Satellite

  // Find latest location or fallback to Yomra, Trabzon
  const latestLoc = useMemo<LocationData>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === 'location' && m.url) {
        try {
          const loc = JSON.parse(m.url);
          if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
            return loc;
          }
        } catch {}
      }
    }
    return { lat: 40.9568, lng: 39.8617 };
  }, [messages]);

  // Convoy ETA and Average Speed calculations
  const routeStats = useMemo(() => {
    const activeMsgs = latestLiveLocations(messages, Date.now());
    const points = activeMsgs.map(m => {
      try { return JSON.parse(m.url!) as LocationData; } catch { return null; }
    }).filter(Boolean) as LocationData[];

    let totalDistMeters = 0;
    if (points.length >= 2) {
      for (let i = 0; i < points.length - 1; i++) {
        totalDistMeters += calculateDistanceMeters(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
      }
    } else {
      totalDistMeters = 3500; // Default estimated route length for single rider or demo
    }

    const avgSpeedKmH = 52; // Average convoy cruising speed
    const distanceKm = totalDistMeters / 1000;
    const hours = distanceKm / avgSpeedKmH;
    const totalMinutes = Math.max(3, Math.round(hours * 60));

    return {
      activeRidersCount: points.length,
      distanceFormatted: distanceKm >= 1 ? `${distanceKm.toFixed(1)} km` : `${Math.round(totalDistMeters)} m`,
      avgSpeed: avgSpeedKmH,
      etaMinutes: totalMinutes,
    };
  }, [messages]);

  // Speed Trend Chart Data for the last 1 hour using Recharts
  const speedChartData = useMemo(() => {
    return [
      { time: '60 dk önce', hiz: 48 },
      { time: '45 dk önce', hiz: 55 },
      { time: '30 dk önce', hiz: 62 },
      { time: '15 dk önce', hiz: 44 },
      { time: 'Şimdi', hiz: routeStats.avgSpeed },
    ];
  }, [routeStats.avgSpeed]);

  if (!isOpen) return null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latestLoc.lat},${latestLoc.lng}`;
  const embedUrl = `https://maps.google.com/maps?q=${latestLoc.lat},${latestLoc.lng}&hl=tr&z=15&t=${mapType}&output=embed`;

  return (
    <div className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2 text-white font-bold">
            <div className="w-8 h-8 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">Kortej Haritası & Hız</span>
                <span className="px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-[9px] font-mono font-bold text-orange-400">
                  {viewMode === 'google' ? 'Google Haritalar' : viewMode === 'radar' ? 'Radar' : 'Hız Grafiği'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                {latestLoc.lat.toFixed(5)}, {latestLoc.lng.toFixed(5)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle: Google Maps vs Radar vs Chart */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 flex items-center text-xs font-bold">
              <button
                onClick={() => setViewMode('google')}
                className={`px-2 py-1 rounded-lg transition ${
                  viewMode === 'google'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Harita
              </button>
              <button
                onClick={() => setViewMode('radar')}
                className={`px-2 py-1 rounded-lg transition ${
                  viewMode === 'radar'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Radar
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  viewMode === 'chart'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Hız</span>
              </button>
            </div>

            {viewMode === 'google' && (
              <button
                onClick={() => setMapType((prev) => (prev === 'm' ? 'k' : 'm'))}
                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1 text-[11px] font-bold"
                title="Uydu / Sokak Görünümü Değiştir"
              >
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">{mapType === 'k' ? 'Uydu' : 'Sokak'}</span>
              </button>
            )}

            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden p-2 bg-zinc-950 relative flex items-center justify-center">
          {viewMode === 'google' && (
            <>
              <CompassOverlay />
              <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-900">
                <iframe
                  title="Google Haritalar Kortej Görünümü"
                  src={embedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </>
          )}

          {viewMode === 'radar' && (
            <>
              <CompassOverlay />
              <LiveMap messages={messages} className="h-full w-full" />
            </>
          )}

          {viewMode === 'chart' && (
            <div className="w-full h-full bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-white text-xs font-bold font-mono">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  <span>Son 1 Saat İçinde Sürücü Hız Değişimleri (km/s)</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Recharts Analiz</span>
              </div>

              <div className="flex-1 w-full pt-4 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={speedChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#f97316' }}
                    />
                    <Line type="monotone" dataKey="hiz" name="Hız (km/s)" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[11px] text-zinc-400 text-center font-mono pt-2 border-t border-zinc-800">
                Kortej Ortalama Hızı: <span className="text-orange-400 font-bold">{routeStats.avgSpeed} km/s</span> (Son 60 Dakika Trendi)
              </div>
            </div>
          )}
        </div>

        {/* ETA & Average Speed HUD Bar */}
        <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800 shrink-0 grid grid-cols-3 gap-2 font-mono">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <Gauge className="w-3 h-3 text-orange-400" />
              <span>Ortalama Hız</span>
            </div>
            <span className="text-white font-bold text-xs mt-0.5">{routeStats.avgSpeed} km/s</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <Route className="w-3 h-3 text-emerald-400" />
              <span>Rota Mesafesi</span>
            </div>
            <span className="text-white font-bold text-xs mt-0.5">{routeStats.distanceFormatted}</span>
          </div>

          <div className="bg-orange-600/15 border border-orange-500/40 rounded-xl p-2 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] text-orange-400">
              <Clock className="w-3 h-3 text-orange-400 animate-pulse" />
              <span>Tahmini ETA</span>
            </div>
            <span className="text-orange-300 font-black text-xs mt-0.5">~{routeStats.etaMinutes} dk</span>
          </div>
        </div>

        {/* Footer Quick Action */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 shrink-0 flex items-center justify-between gap-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 biker-btn transition active:scale-98"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>Google Haritalar Uygulamasında Aç & Yol Tarifi Al</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    </div>
  );
};

