import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Building2,
  Truck,
  Sparkles,
  ArrowRight,
  Download,
  Users,
  Navigation,
  Phone,
  MapPin,
  Clock,
  Check
} from 'lucide-react';
import { AggregationLot, BuyerRequirement } from '../../types';
import { BuyerDeliveryRouteModal } from './BuyerDeliveryRouteModal';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface BulkOrdersContractsProps {
  lot: AggregationLot;
  requirement: BuyerRequirement;
  onNavigate: (screen: number) => void;
}

export const BulkOrdersContracts: React.FC<BulkOrdersContractsProps> = ({
  lot,
  requirement,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [showRouteModal, setShowRouteModal] = useState<boolean>(false);
  const totalContractValue = Math.round(lot.aggregatedQuantityKg * lot.avgPricePerKg);

  const handleOpenRoute = () => {
    setShowRouteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono mb-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
            <span>{t('buyer.ordersAgreements')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('buyer.bulkContractExecution')}
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
            {t('buyer.contractDescription')}
          </p>
        </div>

        <button
          onClick={handleOpenRoute}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-teal-500 transition shadow-lg shadow-emerald-950/20 whitespace-nowrap"
        >
          <Navigation className="w-4 h-4 text-slate-950" />
          <span>Track Delivery Route</span>
        </button>
      </div>

      {/* Contract Certificate Box */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <h2 className="font-heading font-extrabold text-slate-900 text-xl">
                {t('buyer.smartAgreement')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              {t('buyer.agreementReference')}: <span className="font-bold text-slate-800">{lot.id ? `ORD-${lot.id.substring(0, 8).toUpperCase()}` : 'AGRILINK-2026-B2B-08491'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-sm">
              <Lock className="w-3.5 h-3.5 text-emerald-700" /> {t('buyer.paymentStatus')}: Escrow Funded & Verified
            </span>
          </div>
        </div>

        {/* Contract Core Clauses - Contact & Entity Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Buyer Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">
                {t('buyer.buyerEntity')}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Authorized Buyer</span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{requirement.buyerName || 'Bulk Buyer'}</div>
            <p className="text-slate-700 text-xs flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{requirement.destinationName}</span>
            </p>
            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Type: {requirement.buyerType || 'Bulk Enterprise / B2B'}</span>
            </div>
          </div>

          {/* Aggregated Producer Network */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">
                {t('buyer.aggregatedProducerNetwork')}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {lot.participatingFarmers.length} Farmer{lot.participatingFarmers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">
              Regional Farmer Cluster & FPO Network
            </div>
            <p className="text-slate-700 text-xs flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Hub: {lot.hubLocation?.name || 'Local Consolidation Center'}</span>
            </p>
            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Participating: {lot.participatingFarmers.map(f => f.farmerName).join(', ') || 'Registered Farmers'}</span>
            </div>
          </div>
        </div>

        {/* Participating Farmers Detail Section */}
        {lot.participatingFarmers && lot.participatingFarmers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Contributing Smallholder Producers</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lot.participatingFarmers.map((f, i) => (
                <div key={f.listingId || i} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{f.farmerName || `Farmer #${i + 1}`}</span>
                    <span className="text-[11px] text-slate-600">
                      {f.distanceToHubKm ? `${f.distanceToHubKm} km from hub` : 'Direct Farmgate'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-800 text-sm">{f.quantityKg.toLocaleString()} kg</span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      ₹{lot.avgPricePerKg.toFixed(2)}/kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Contract Table */}
        <div className="p-5 rounded-xl bg-slate-900 text-white space-y-3 text-xs shadow-inner">
          <div className="flex justify-between text-slate-200">
            <span>{t('buyer.commodity')}:</span>
            <span className="font-bold text-white text-sm">{lot.cropName} ({lot.qualityGrade || 'Grade A'})</span>
          </div>
          <div className="flex justify-between text-slate-200">
            <span>{t('buyer.totalConsolidatedVolume')}:</span>
            <span className="font-bold text-white font-mono text-sm">{lot.aggregatedQuantityKg.toLocaleString()} kg</span>
          </div>
          <div className="flex justify-between text-slate-200">
            <span>{t('buyer.fixedFarmgateRate')}:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">₹{lot.avgPricePerKg.toFixed(2)}/kg</span>
          </div>
          <div className="pt-3 border-t border-slate-700 flex justify-between text-sm font-bold">
            <span className="text-white text-base">{t('buyer.totalEscrowSettlement')}:</span>
            <span className="text-emerald-400 font-mono text-xl">₹{totalContractValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Disintermediation Guarantee */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-700" /> {t('buyer.auditStamp')}
          </div>
          <p className="text-emerald-800 leading-relaxed">
            {t('buyer.auditDescription')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            onClick={() => onNavigate(7)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300 transition"
          >
            ← {t('buyer.backToDashboard')}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenRoute}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs sm:text-sm hover:from-emerald-500 hover:to-teal-600 transition shadow-lg shadow-emerald-950/20 flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Track Delivery Route Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Buyer Delivery Route Tracking Modal */}
      <BuyerDeliveryRouteModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        order={{
          id: lot.id,
          cropName: lot.cropName,
          totalQuantityKg: lot.aggregatedQuantityKg,
          status: lot.status || 'IN_TRANSIT',
          destinationName: requirement.destinationName,
          destinationLat: requirement.destinationLat,
          destinationLng: requirement.destinationLng,
          transporter: {
            name: 'MahaKisan Logistics Express',
            vehicleNumber: 'MH-15-EG-4829',
            vehicleType: 'Eicher Pro 2049 (2.5T)',
            phone: '+91 98220 94812'
          },
          items: lot.participatingFarmers
        }}
      />
    </div>
  );
};

