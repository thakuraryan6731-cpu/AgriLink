import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Eye,
  Calendar,
  AlertCircle,
  Phone
} from 'lucide-react';
import { FarmerActiveOrder } from '../../types';
import { FarmerDeliveryTrackingModal } from './FarmerDeliveryTrackingModal';
import { useLanguage } from '../../i18n/LanguageContext';

interface ActiveOrdersProps {
  farmerOrders?: FarmerActiveOrder[];
  isLoading?: boolean;
  onNavigate: (screen: number) => void;
}

export const ActiveOrders: React.FC<ActiveOrdersProps> = ({
  farmerOrders = [],
  isLoading = false,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<FarmerActiveOrder | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono mb-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
            <span>{t('nav.activeOrders')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('orders.title')}
          </h1>
          <p className="text-xs text-emerald-100/90 max-w-xl">
            {t('orders.description')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(4)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition shadow"
          >
            <span>{t('orders.findBuyers')}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-48"></div>
                  <div className="h-3 bg-slate-200 rounded w-32"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* State: No Active Orders (Real Authenticated Farmer Empty State) */}
      {!isLoading && farmerOrders.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4 max-w-xl mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 font-heading">{t('orders.none')}</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {t('orders.noneHint')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => onNavigate(2)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition"
            >
              {t('orders.viewListings')}
            </button>
            <button
              onClick={() => onNavigate(4)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold rounded-xl text-xs hover:from-emerald-500 hover:to-teal-600 transition shadow-lg shadow-emerald-950/20 flex items-center gap-1.5"
            >
              <span>{t('orders.exploreDemand')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Orders List */}
      {!isLoading && farmerOrders.length > 0 && (
        <div className="space-y-6">
          {farmerOrders.map((order) => {
            const fillPercentage = order.targetQuantityKg > 0
              ? Math.min(100, Math.round((order.aggregatedQuantityKg / order.targetQuantityKg) * 100))
              : 100;

            const normalizedStatus = (order.status || '').toUpperCase();

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 hover:border-emerald-300 transition shadow-sm"
              >
                {/* Batch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold">
                      <Package className="w-6 h-6 text-emerald-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-extrabold text-slate-900 text-lg">
                          {order.cropName} {t('orders.pooledLot')}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                          {order.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t('orders.buyer')}:</span>
                          <strong className="text-slate-900">{order.buyerName}</strong>
                        </span>
                        <span>({order.buyerLocation})</span>
                        {order.buyerContact && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-[11px] font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-700" />
                            {order.buyerContact}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 font-mono shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {t('orders.status')}: {normalizedStatus}
                    </span>
                  </div>
                </div>

                {/* Progress & Capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-bold">
                      {t('orders.progress')} ({fillPercentage}% {t('orders.target')}):
                    </span>
                    <span className="font-mono text-emerald-800 font-extrabold">
                      {order.aggregatedQuantityKg.toLocaleString()} kg / {order.targetQuantityKg.toLocaleString()} kg Target
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Micro-Cluster Participating Smallholder Farmers */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-700" /> {t('orders.participants')} ({order.participatingFarmers.length})
                    </h4>
                    {order.myAllocatedQuantityKg > 0 && (
                      <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {t('orders.yourAllocation')}: <strong>{order.myAllocatedQuantityKg.toLocaleString()} kg</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {order.participatingFarmers.map((farmer, idx) => (
                      <div
                        key={farmer.listingId || idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {t('orders.stop')} #{idx + 1}: {farmer.farmerName}
                          </span>
                          <span className="text-[11px] text-slate-600">
                            {farmer.distanceToHubKm ? `${farmer.distanceToHubKm} km from hub` : t('orders.localFarmgate')}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-emerald-800 text-sm">{farmer.quantityKg.toLocaleString()} kg</span>
                          <span className="block text-[10px] text-slate-500 font-medium">
                            {order.aggregatedQuantityKg > 0
                              ? `${((farmer.quantityKg / order.aggregatedQuantityKg) * 100).toFixed(0)}% ${t('orders.lotShare')}`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Transporter & CVRP Milk-Run Dispatch */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                      <Truck className="w-5 h-5 text-amber-800" />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <span className="text-slate-600 text-[11px] font-bold">{t('orders.transporter')}</span>
                      {order.transporter ? (
                        <>
                          <div className="font-bold text-slate-900 text-sm">
                            {order.transporter.name} ({order.transporter.vehicleNumber || t('orders.vehicleAssigned')})
                          </div>
                          <div className="text-slate-600">
                            {t('orders.vehicleCapacity')} <strong className="text-slate-900">{order.transporter.capacityKg || 2500} kg</strong>
                          </div>
                        </>
                      ) : (
                        <div className="text-amber-800 font-bold">
                          {t('orders.pendingDispatch')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedOrderForTracking(order)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('orders.trackDelivery')}</span>
                    </button>

                    <button
                      onClick={() => onNavigate(6)}
                      className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs border border-emerald-300 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{t('orders.viewFinancials')}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-800" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Read-Only Farmer Delivery Tracking Modal */}
      <FarmerDeliveryTrackingModal
        order={selectedOrderForTracking}
        isOpen={Boolean(selectedOrderForTracking)}
        onClose={() => setSelectedOrderForTracking(null)}
      />
    </div>
  );
};

