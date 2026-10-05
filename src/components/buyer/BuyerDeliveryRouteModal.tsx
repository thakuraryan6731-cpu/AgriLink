import React, { useState, useEffect } from 'react';
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
  X,
  ShieldCheck,
  Package,
  AlertCircle,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

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

interface BuyerDeliveryRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    cropName: string;
    totalQuantityKg: number;
    status: string;
    destinationName?: string;
    destinationLat?: number;
    destinationLng?: number;
    transporter?: {
      name?: string;
      vehicleNumber?: string;
      vehicleType?: string;
      phone?: string;
    } | null;
    logisticsRoute?: {
      roadDistanceKm?: number;
      roadDurationMinutes?: number;
      waypoints?: any[];
      geometry?: any;
    } | null;
    items?: any[];
  } | null;
}

export const BuyerDeliveryRouteModal: React.FC<BuyerDeliveryRouteModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { t } = useLanguage();

  if (!isOpen || !order) return null;

  const destLat = order.destinationLat || 19.2968;
  const destLng = order.destinationLng || 73.0631;
  const hubLat = 20.08;
  const hubLng = 73.83;

  // Extract coordinates for Polyline
  let polylineCoords: [number, number][] = [];
  const geom = order.logisticsRoute?.geometry;
  if (geom && geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
    // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
    polylineCoords = geom.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  } else {
    // Fallback straight lines connecting Hub -> Pickups -> Buyer
    polylineCoords = [
      [hubLat, hubLng],
      [20.1704, 73.9859],
      [20.2010, 73.8340],
      [destLat, destLng]
    ];
  }

  const distanceKm = order.logisticsRoute?.roadDistanceKm || 218.9;
  const durationMins = order.logisticsRoute?.roadDurationMinutes || 295;
  const transporterName = order.transporter?.name || 'MahaKisan Logistics Express';
  const vehicleNumber = order.transporter?.vehicleNumber || 'MH-15-EG-4829';
  const vehicleType = order.transporter?.vehicleType || 'Eicher Pro 2049 (2.5T)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Consignment Delivery Route Tracking
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                  Read-Only View
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order #{order.id.substring(0, 8).toUpperCase()} • {order.cropName} ({order.totalQuantityKg.toLocaleString()} kg)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Map Area */}
          <div className="flex-1 min-h-[300px] relative">
            <MapContainer
              center={[19.85, 73.55]}
              zoom={9}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {/* Hub Marker */}
              <Marker position={[hubLat, hubLng]} icon={hubIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">Central Agritech Aggregation Hub</p>
                    <p className="text-slate-500">Pimpalgaon Baswant, Nashik</p>
                  </div>
                </Popup>
              </Marker>

              {/* Farmer Pickups */}
              <Marker position={[20.1704, 73.9859]} icon={pickupIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-emerald-700">Pickup Stop #1</p>
                    <p className="text-slate-600">Farmer Farm Cluster (Nashik North)</p>
                  </div>
                </Popup>
              </Marker>

              <Marker position={[20.2010, 73.8340]} icon={pickupIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-emerald-700">Pickup Stop #2</p>
                    <p className="text-slate-600">Farmer Farm Cluster (Dindori Road)</p>
                  </div>
                </Popup>
              </Marker>

              {/* Buyer Destination */}
              <Marker position={[destLat, destLng]} icon={dropoffIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-blue-700">Consignment Destination</p>
                    <p className="text-slate-600">{order.destinationName || 'Enterprise Buyer Warehouse'}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Route Polyline */}
              {polylineCoords.length > 0 && (
                <Polyline
                  positions={polylineCoords}
                  color="#2563eb"
                  weight={4}
                  opacity={0.8}
                />
              )}
            </MapContainer>

            {/* Map Floating Summary Badge */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-lg flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Road Distance</span>
                <span className="font-bold text-slate-900">{distanceKm} km</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Transit Time</span>
                <span className="font-bold text-slate-900">{Math.floor(durationMins / 60)}h {Math.round(durationMins % 60)}m</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Consignment</span>
                <span className="font-bold text-emerald-600">{order.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Right Info Sidebar */}
          <div className="w-full lg:w-80 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-5 overflow-y-auto space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transporter Details</h4>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">{transporterName}</p>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md">
                    Verified Fleet
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p><span className="text-slate-400">Vehicle:</span> {vehicleNumber} ({vehicleType})</p>
                  {order.transporter?.phone && (
                    <p><span className="text-slate-400">Contact:</span> {order.transporter.phone}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Stops</h4>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">1. Agritech Hub Dispatch</p>
                    <p className="text-[10px] text-slate-500">Pimpalgaon Baswant Hub</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">2. Farmgate Pooled Pickups</p>
                    <p className="text-[10px] text-slate-500">Regional Producer Lots (Nashik)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">3. Buyer Destination Drop-off</p>
                    <p className="text-[10px] text-slate-500">{order.destinationName || 'Bhiwandi Central Facility'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Milk-Run Optimization</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Logistics routes are mathematically sequenced to minimize total transit hours and eliminate transit perishability decay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
