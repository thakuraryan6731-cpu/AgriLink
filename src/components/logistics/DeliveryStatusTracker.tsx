import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Navigation,
  Thermometer,
  Gauge,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { CVRPRoute } from '../../types';
import { transitionOrderStatus } from '../../services/logisticsService';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface DeliveryStatusTrackerProps {
  cvrpRoute?: CVRPRoute;
  onNavigate: (screen: number) => void;
}

export const DeliveryStatusTracker: React.FC<DeliveryStatusTrackerProps> = ({
  cvrpRoute,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [orderState, setOrderState] = useState<string>('PICKUP_SCHEDULED');
  const [allowedNextStates, setAllowedNextStates] = useState<string[]>(['IN_TRANSIT']);
  const [lastTransitionTime, setLastTransitionTime] = useState<string>(new Date().toLocaleTimeString());
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const orderId = 'ORD-MH-TM-2026';

  const handleStateTransition = async (targetState: string) => {
    setIsTransitioning(true);
    setTransitionError(null);

    try {
      const result = await transitionOrderStatus(orderId, targetState, orderState);
      setOrderState(result.current_state);
      setAllowedNextStates(result.allowed_next_states);
      setLastTransitionTime(new Date(result.timestamp).toLocaleTimeString());

      if (result.current_state === 'DELIVERED') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      console.error('[DeliveryStatusTracker] Transition failed:', err);
      setTransitionError(err.message || 'Failed to update order state');
    } finally {
      setIsTransitioning(false);
    }
  };

  const steps = [
    {
      title: 'Farmer Pickups Completed',
      desc: 'Collected produce from participating smallholders in Nashik cluster.',
      stateRequired: 'PICKUP_SCHEDULED',
      isDone: orderState === 'PICKUP_SCHEDULED' || orderState === 'IN_TRANSIT' || orderState === 'DELIVERED'
    },
    {
      title: 'Consolidated Cargo In Transit',
      desc: 'Consignment en route to Buyer Distribution Center via NH-848.',
      stateRequired: 'IN_TRANSIT',
      isDone: orderState === 'IN_TRANSIT' || orderState === 'DELIVERED'
    },
    {
      title: 'Final Delivery & Inspection',
      desc: 'Cargo arrived at Buyer DC and passed receiving inspection.',
      stateRequired: 'DELIVERED',
      isDone: orderState === 'DELIVERED'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('nav.deliveryTracking')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('logistics.deliveryTitle')}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {t('logistics.deliveryDescription')} ({orderState})
          </p>
        </div>

        <button
          onClick={() => onNavigate(15)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm hover:from-purple-500 hover:to-indigo-500 transition shadow-lg shadow-purple-900/30 whitespace-nowrap"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t('logistics.viewMarketImpact')}</span>
        </button>
      </div>

      {/* Error Banner */}
      {transitionError && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-xs text-red-300">{transitionError}</div>
        </div>
      )}

      {/* 4 Demo Telemetry Cards (Explicitly labeled simulated) */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono text-amber-400/80 uppercase tracking-wider flex items-center gap-1.5">
          <span>{t('logistics.demoTelemetry')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 opacity-90">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Simulated Speed</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-heading">
              58 <span className="text-xs text-slate-400 font-normal">km/h</span>
            </div>
            <p className="text-xs text-emerald-400 mt-1">Simulated Highway Telemetry</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800 opacity-90">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Simulated Temp</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Thermometer className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-heading">
              18.2°C <span className="text-xs text-slate-400 font-normal">Optimal</span>
            </div>
            <p className="text-xs text-cyan-300 mt-1">Simulated Cold Chain Crate</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Consignment Payload</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-400 font-heading">
              1,500 <span className="text-xs text-slate-400 font-normal">kg</span>
            </div>
            <p className="text-xs text-amber-300 mt-1">Aggregated Smallholder Produce</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Order State</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {orderState}
            </div>
            <p className="text-xs text-slate-400 mt-1">Updated at {lastTransitionTime}</p>
          </div>
        </div>
      </div>

      {/* Order State Transition Action Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <Navigation className="w-4 h-4 text-amber-400" /> Order Lifecycle Actions (Order: {orderId})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute verified transitions through the backend 7-state order state machine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {orderState === 'PICKUP_SCHEDULED' && (
              <button
                onClick={() => handleStateTransition('IN_TRANSIT')}
                disabled={isTransitioning}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {isTransitioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                <span>{t('logistics.startTransit')}</span>
              </button>
            )}

            {orderState === 'IN_TRANSIT' && (
              <button
                onClick={() => handleStateTransition('DELIVERED')}
                disabled={isTransitioning}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {isTransitioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{t('logistics.confirmDelivery')}</span>
              </button>
            )}

            {orderState === 'DELIVERED' && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                ✓ Order Delivered & Verified at Destination
              </div>
            )}
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 pl-6">
          {steps.map((s, idx) => (
            <div key={idx} className="relative group">
              <div
                className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.isDone
                  ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                  : 'bg-slate-800 text-slate-500'
                  }`}
              >
                {s.isDone ? '✓' : idx + 1}
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{s.title}</div>
                  <div className="text-slate-400 mt-0.5">{s.desc}</div>
                </div>
                <div className="font-mono text-slate-400 text-right">
                  <span className={`text-[10px] uppercase font-bold ${s.isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {s.isDone ? 'COMPLETED' : 'PENDING STATE'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
