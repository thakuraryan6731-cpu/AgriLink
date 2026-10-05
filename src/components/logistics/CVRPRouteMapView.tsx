import React, { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from 'react-leaflet';
import L from 'leaflet';
import {
  Truck,
  MapPin,
  Clock,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { CVRPRoute, CVRPSolveResponse } from '../../types';
import { getCVRPRoute, createConfirmedRoute } from '../../services/logisticsService';
import { useLanguage } from '../../i18n/LanguageContext';

// Fix Leaflet default marker icon paths in React
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hubIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface CVRPRouteMapViewProps {
  cvrpRoute?: CVRPRoute;
  onNavigate: (screen: number) => void;
}

export const CVRPRouteMapView: React.FC<CVRPRouteMapViewProps> = ({
  cvrpRoute: initialRoute,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [cvrpData, setCvrpData] = useState<CVRPSolveResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const centerLat = 19.85;
  const centerLng = 73.55;

  const fetchRoute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const payload = {
      hub: { lat: 20.08, lng: 73.83 },
      pickup_stops: [
        { listing_id: 'LIST-TM-01', lat: 20.1704, lng: 73.9859, quantity_kg: 650 },
        { listing_id: 'LIST-TM-02', lat: 20.2010, lng: 73.8340, quantity_kg: 450 },
        { listing_id: 'LIST-TM-03', lat: 19.9820, lng: 73.6840, quantity_kg: 400 }
      ],
      buyer: { lat: 19.2968, lng: 73.0631 },
      vehicle_capacity_kg: 2500
    };

    try {
      const data = await getCVRPRoute(payload);
      setCvrpData(data);
    } catch (err: any) {
      console.error('[CVRPRouteMapView] Failed to fetch route:', err);
      setError('Route optimization is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const handleConfirmAndPersist = async () => {
    if (!cvrpData) return;
    setIsPersisting(true);

    try {
      await createConfirmedRoute({
        aggregated_order_id: 'ORD-MH-TM-2026',
        transporter_id: 'usr-transporter-01',
        vehicle_number: 'MH-15-EG-4829',
        vehicle_type: 'Eicher Pro 2049 (2.5T)',
        vehicle_capacity_kg: cvrpData.vehicle_capacity_kg,
        current_load_kg: cvrpData.total_load_kg,
        route_waypoints: cvrpData.optimized_route,
        road_distance_km: cvrpData.road_distance_km,
        road_duration_minutes: cvrpData.road_duration_minutes,
        baseline_distance_km: cvrpData.baseline_distance_km,
        distance_savings_km: cvrpData.distance_savings_km,
        geometry: cvrpData.geometry
      });
      setIsConfirmed(true);
      onNavigate(14);
    } catch (err: any) {
      console.error('[CVRPRouteMapView] Failed to persist route:', err);
      alert('Could not persist route: ' + err.message);
    } finally {
      setIsPersisting(false);
    }
  };

  // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
  const leafletPolylinePositions: [number, number][] =
    cvrpData?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('nav.routePlanner')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('logistics.routeTitle')}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {t('logistics.routeDescription')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirmAndPersist}
            disabled={!cvrpData || isPersisting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/20 whitespace-nowrap disabled:opacity-50"
          >
            {isPersisting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>{t('logistics.confirmRoute')}</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-red-200">Route Geometry Unavailable</div>
              <div className="text-xs text-red-400 mt-0.5">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchRoute}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && !error && (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <div className="text-sm text-slate-300 font-bold">Preparing your route...</div>
          <p className="text-xs text-slate-500">Checking roads and pickup timing.</p>
        </div>
      )}

      {/* Map & Waypoint Sequence Split Grid */}
      {!isLoading && cvrpData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaflet Map Card (2 Cols) */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col h-[560px]">
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold text-white">Recommended collection route</span>
                <span className="text-slate-400 font-mono">({cvrpData.road_distance_km} km road distance)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span> Hub (Start)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Pickups
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Buyer DC
                </span>
              </div>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-800 relative z-10">
              <MapContainer
                center={[centerLat, centerLng]}
                zoom={9}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Waypoint Markers */}
                {cvrpData.optimized_route.map((wp, idx) => (
                  <Marker
                    key={idx}
                    position={[wp.lat, wp.lng]}
                    icon={wp.type === 'hub' ? hubIcon : wp.type === 'farmer' ? pickupIcon : dropoffIcon}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-emerald-400">
                          Stop #{idx + 1}: {wp.type === 'hub' ? 'Depot Hub' : wp.type === 'farmer' ? `Farmer ${wp.listing_id}` : 'Buyer DC'}
                        </div>
                        <div className="text-slate-300">
                          Payload after stop: {wp.type === 'farmer' ? wp.load_after_pickup_kg : wp.load_after_stop_kg} kg
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Real OSRM Road Polyline */}
                {leafletPolylinePositions.length > 0 && (
                  <Polyline
                    positions={leafletPolylinePositions}
                    pathOptions={{
                      color: '#22c55e',
                      weight: 5,
                      opacity: 0.85,
                      lineJoin: 'round'
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          {/* Waypoint Order & Summary Card (1 Col) */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white text-base font-heading">
                  Optimized Stop Progression
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ordered to keep the journey efficient.
                </p>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {cvrpData.optimized_route.map((wp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-200">
                          {wp.type === 'hub' ? 'Hub Dispatch' : wp.type === 'farmer' ? `Stop #${idx}: ${wp.listing_id}` : 'Buyer Delivery'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {wp.type === 'farmer' ? `+${wp.quantity_kg} kg produce` : wp.type === 'hub' ? 'Start (0 kg)' : `Consignment (${wp.load_after_stop_kg} kg)`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-300">
                      {wp.type === 'farmer' ? wp.load_after_pickup_kg : wp.load_after_stop_kg} kg
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>{t('logistics.totalDistance')}</span>
                <strong className="text-white">{cvrpData.road_distance_km} km</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>{t('logistics.durationLabel')}</span>
                <strong className="text-white">{cvrpData.road_duration_minutes} min</strong>
              </div>
              <div className="flex justify-between text-xs text-emerald-400 font-mono">
                <span>{t('logistics.distanceSaved')}</span>
                <strong>+{cvrpData.distance_savings_km} km ({cvrpData.distance_savings_pct}% saved)</strong>
              </div>

              <button
                onClick={handleConfirmAndPersist}
                disabled={isPersisting}
                className="w-full mt-3 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-2"
              >
                <span>{t('logistics.confirmRoute')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
