import React from 'react';
import {
  X,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { FarmerActiveOrder } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

// Leaflet custom marker icons
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

const ORDER_STEPS = [
  { key: 'MATCHED', label: 'Matched' },
  { key: 'AGGREGATING', label: 'Pooling' },
  { key: 'BUYER_CONFIRMED', label: 'Confirmed' },
  { key: 'PICKUP_SCHEDULED', label: 'Scheduled' },
  { key: 'IN_TRANSIT', label: 'In-Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'PAYMENT_CONFIRMED', label: 'Settled' },
] as const;

interface FarmerDeliveryTrackingModalProps {
  order: FarmerActiveOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FarmerDeliveryTrackingModal: React.FC<FarmerDeliveryTrackingModalProps> = ({
  order,
  isOpen,
  onClose
}) => {
  const { t } = useLanguage();
  if (!isOpen || !order) return null;

  const route = order.logisticsRoute;

  // Convert GeoJSON [lng, lat] LineString to Leaflet [lat, lng] array
  const polylineCoords: [number, number][] = React.useMemo(() => {
    if (!route?.geometry?.coordinates || !Array.isArray(route.geometry.coordinates)) {
      return [];
    }
    return route.geometry.coordinates.map((pt) => [pt[1], pt[0]] as [number, number]);
  }, [route]);

  // Center coordinate for Leaflet map
  const mapCenter: [number, number] = React.useMemo(() => {
    if (polylineCoords.length > 0) {
      return polylineCoords[Math.floor(polylineCoords.length / 2)];
    }
    return [order.hubLocation.lat || 20.08, order.hubLocation.lng || 73.83];
  }, [polylineCoords, order]);

  // Determine active step index
  const normalizedStatus = (order.status || '').toUpperCase();
  const currentStepIdx = ORDER_STEPS.findIndex((s) => s.key === normalizedStatus);
  const activeStepIdx = currentStepIdx >= 0 ? currentStepIdx : 2; // Default to 'BUYER_CONFIRMED' if legacy

  return (
    <div className="tracking-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/90">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                {t('modal.readOnly')}
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {t('modal.orderId')} <strong className="text-slate-200">{order.id}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <span>{t('modal.deliveryTracker')}</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Order Lifecycle Progress Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                {t('modal.lifecycle')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                STATUS: {order.status.toUpperCase()}
              </span>
            </div>

            {/* Stepper Progress */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
              {ORDER_STEPS.map((step, idx) => {
                const isPassed = idx < activeStepIdx;
                const isCurrent = idx === activeStepIdx;
                return (
                  <div key={step.key} className="text-center space-y-1.5">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${isPassed
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                        : isCurrent
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse'
                          : 'bg-slate-800'
                        }`}
                    />
                    <span
                      className={`text-[9px] sm:text-[10px] block truncate font-mono ${isCurrent
                        ? 'text-emerald-400 font-bold'
                        : isPassed
                          ? 'text-slate-300'
                          : 'text-slate-600'
                        }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Order Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">{t('modal.commodityLot')}</span>
              <span className="font-bold text-white text-sm font-heading">{order.cropName}</span>
              <span className="text-slate-500 text-[11px] block">
                {t('modal.totalBatch')} {order.aggregatedQuantityKg} kg
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">{t('modal.contribution')}</span>
              <span className="font-extrabold text-emerald-400 text-sm font-heading">
                {order.myAllocatedQuantityKg} kg
              </span>
              <span className="text-slate-500 text-[11px] block">
                {order.aggregatedQuantityKg > 0
                  ? `${Math.round((order.myAllocatedQuantityKg / order.aggregatedQuantityKg) * 100)}% ${t('modal.pooledLot')}`
                  : '—'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">{t('modal.procuringBuyer')}</span>
              <span className="font-bold text-white text-sm truncate block">{order.buyerName}</span>
              <span className="text-slate-500 text-[11px] truncate block">
                {t('modal.dropoff')} {order.buyerLocation}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">{t('modal.assignedTransporter')}</span>
              <span className="font-bold text-white text-sm truncate block">
                {order.transporter?.name || route?.transporterName || t('modal.pendingAssignment')}
              </span>
              <span className="text-slate-500 text-[11px] block">
                {order.transporter?.vehicleNumber || route?.vehicleNumber || t('orders.vehicleAssigned')}
              </span>
            </div>
          </div>

          {/* Logistics Route Details & Road Map */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>{t('modal.routeDetails')}</span>
              </h3>
              {route && (
                <span className="text-[11px] font-mono text-cyan-400">
                  Route: {route.routeCode}
                </span>
              )}
            </div>

            {route ? (
              <div className="space-y-4">
                {/* Route Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-center font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Total Road Distance</span>
                    <span className="font-bold text-white text-sm">{route.roadDistanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Estimated Duration</span>
                    <span className="font-bold text-white text-sm">{route.roadDurationMinutes} mins</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Distance Saved</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {route.distanceSavingsKm !== undefined ? `+${route.distanceSavingsKm} km` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Fleet Status</span>
                    <span className="font-bold text-cyan-400 text-sm">{route.status.toUpperCase()}</span>
                  </div>
                </div>

                {/* Interactive Leaflet Route Map */}
                {polylineCoords.length > 0 ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 h-72 w-full z-0 relative">
                    <MapContainer
                      center={mapCenter}
                      zoom={10}
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Road Geometry Polyline */}
                      <Polyline
                        positions={polylineCoords}
                        color="#06b6d4"
                        weight={4}
                        opacity={0.85}
                      />

                      {/* Hub Marker */}
                      {order.hubLocation.lat && order.hubLocation.lng && (
                        <Marker position={[order.hubLocation.lat, order.hubLocation.lng]} icon={hubIcon}>
                          <Popup>
                            <strong>Central Hub</strong>
                            <br />
                            {order.hubLocation.name}
                          </Popup>
                        </Marker>
                      )}

                      {/* Farmer Pickup Markers */}
                      {order.participatingFarmers.map((f, i) => (
                        <Marker key={f.listingId || i} position={[f.lat, f.lng]} icon={pickupIcon}>
                          <Popup>
                            <strong>Stop #{i + 1}: {f.farmerName}</strong>
                            <br />
                            Pickup: {f.quantityKg} kg
                          </Popup>
                        </Marker>
                      ))}

                      {/* Buyer Dropoff Marker */}
                      {order.destinationLat && order.destinationLng && (
                        <Marker position={[order.destinationLat, order.destinationLng]} icon={dropoffIcon}>
                          <Popup>
                            <strong>Buyer Dropoff: {order.buyerName}</strong>
                            <br />
                            {order.buyerLocation}
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    The live road route is being prepared.
                  </div>
                )}

                {/* Pickup Waypoint Sequence */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Milk-Run Waypoint Sequence ({order.participatingFarmers.length} Smallholder Stops)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {order.participatingFarmers.map((farmer, idx) => (
                      <div
                        key={farmer.listingId || idx}
                        className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white block text-xs truncate max-w-[120px]">
                              {farmer.farmerName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {farmer.distanceToHubKm ? `${farmer.distanceToHubKm} km from hub` : 'Local Farmgate'}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {farmer.quantityKg} kg
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* State: No Persisted Route Yet */
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 font-heading">
                  Logistics route has not been scheduled yet.
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  The assigned transporter has not yet finalised the pickup route for this order batch. Live route details and pickup times will appear here once dispatched.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            AgriLink AI • Farmer Smallholder View
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition ml-auto"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
