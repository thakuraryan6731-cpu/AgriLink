import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Fuel,
  Gauge,
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { CVRPRoute, CVRPSolveResponse } from '../../types';
import { getCVRPRoute, RoutingServiceError } from '../../services/logisticsService';
import { useLanguage } from '../../i18n/LanguageContext';

interface TransporterHubProps {
  cvrpRoute?: CVRPRoute;
  onNavigate: (screen: number) => void;
}

export const TransporterHub: React.FC<TransporterHubProps> = ({
  cvrpRoute: initialRoute,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [cvrpData, setCvrpData] = useState<CVRPSolveResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCVRPOptimization = useCallback(async () => {
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
      console.error('[TransporterHub] Failed to fetch CVRP route:', err);
      setError('Route optimization is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCVRPOptimization();
  }, [fetchCVRPOptimization]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('nav.fleetOverview')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('logistics.title')}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {t('logistics.description')}
          </p>
        </div>

        <button
          onClick={() => onNavigate(13)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs sm:text-sm hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20 whitespace-nowrap glow-amber"
        >
          <Truck className="w-4 h-4" />
          <span>{t('logistics.openRoute')}</span>
        </button>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-red-200">Route optimization is temporarily unavailable</div>
              <div className="text-xs text-red-400 mt-0.5">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchCVRPOptimization}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('logistics.retry')}</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !error && (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <div className="text-sm text-slate-300 font-bold">Planning the best pickup route...</div>
          <p className="text-xs text-slate-500">We’re checking distances, timing and vehicle space.</p>
        </div>
      )}

      {/* 4 Logistics KPI Cards */}
      {!isLoading && cvrpData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('logistics.capacity')}</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white font-heading">
                {cvrpData.capacity_utilization_pct}% <span className="text-xs text-slate-400 font-normal">Full</span>
              </div>
              <p className="text-xs text-emerald-400 mt-1">
                {cvrpData.total_load_kg} kg / {cvrpData.vehicle_capacity_kg} kg vehicle
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('logistics.distance')}</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white font-heading">
                {cvrpData.road_distance_km} <span className="text-xs text-slate-400 font-normal">km</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                vs {cvrpData.baseline_distance_km} km unoptimized baseline
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('logistics.distanceReduction')}</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-heading">
                +{cvrpData.distance_savings_km} <span className="text-xs text-emerald-300 font-normal">km</span>
              </div>
              <p className="text-xs text-emerald-300 mt-1">
                {cvrpData.distance_savings_pct}% road distance reduction
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('logistics.duration')}</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-400 font-heading">
                {cvrpData.road_duration_minutes} <span className="text-xs text-slate-400 font-normal">min</span>
              </div>
              <p className="text-xs text-purple-300 mt-1">{t('logistics.routeReady')}</p>
            </div>
          </div>

          {/* Active Milk-Run Schedule Card */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    COORDINATED PICKUP
                  </span>
                  <h3 className="font-heading font-bold text-white text-lg">
                    Coordinated pickup schedule
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Vehicle: <strong className="text-slate-200">MH-15-EG-4829</strong> (Eicher Pro 2049, 2.5T) • Timing and capacity optimized
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate(13)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition flex items-center gap-1.5 shadow"
                >
                  <span>{t('logistics.openRoute')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sequential Stops Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('logistics.collectionStops')} ({cvrpData.optimized_route.length}):
              </h4>
              <div className="space-y-2">
                {cvrpData.optimized_route.map((wp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${wp.type === 'farmer'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : wp.type === 'hub'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white">
                          {wp.type === 'hub'
                            ? 'Depot / Aggregation Hub (Start)'
                            : wp.type === 'buyer'
                              ? 'Buyer Distribution Center (Final Dropoff)'
                              : `Farmer Pickup (${wp.listing_id})`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {wp.type === 'farmer'
                            ? `Load +${wp.quantity_kg} kg produce`
                            : wp.type === 'hub'
                              ? 'Vehicle dispatch start point (0 kg)'
                              : `Full consignment arrival (${wp.load_after_stop_kg} kg)`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-slate-300 font-bold block">
                        Payload: {wp.type === 'farmer' ? wp.load_after_pickup_kg : wp.load_after_stop_kg} kg
                      </span>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">
                        {wp.type === 'hub' ? 'Dispatched' : wp.type === 'farmer' ? 'Scheduled Pickup' : 'Destination'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
