import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  MapPin,
  Calendar,
  Sparkles,
  Building2,
  DollarSign,
  AlertCircle,
  Loader2,
  User,
  Phone
} from 'lucide-react';
import { BuyerRequirement, QualityGrade } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createBuyerRequirement, updateMyProfile } from '../../services/dbService';
import { isSupabaseConfigured } from '../../lib/supabase';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface CreateRequirementProps {
  onAddRequirement: (req: BuyerRequirement) => void;
  onNavigate: (screen: number) => void;
}

export const CreateRequirement: React.FC<CreateRequirementProps> = ({
  onAddRequirement,
  onNavigate
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  
  // Mandatory contact & company fields
  const [buyerContactName, setBuyerContactName] = useState(profile?.fullName || '');
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone || '');
  const [companyName, setCompanyName] = useState(profile?.companyName || 'Reliance Retail Fresh Ltd');
  const [buyerType, setBuyerType] = useState<BuyerRequirement['buyerType']>('Modern Retailer');
  
  // Requirement specs
  const [cropName, setCropName] = useState('Tomato');
  const [variety, setVariety] = useState('Vaishali / Firm Red');
  const [requiredQuantityKg, setRequiredQuantityKg] = useState(1500);
  const [maxPricePerKg, setMaxPricePerKg] = useState(29.5);
  const [preferredQualityGrade, setPreferredQualityGrade] = useState<QualityGrade>('Grade A');
  const [deliveryDeadline, setDeliveryDeadline] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [destinationName, setDestinationName] = useState('Reliance Fresh Distribution Center, Bhiwandi');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (!buyerContactName && profile.fullName) setBuyerContactName(profile.fullName);
      if (!buyerPhone && profile.phone) setBuyerPhone(profile.phone);
      if (profile.companyName) setCompanyName(profile.companyName);
    }
  }, [profile]);

  const validateForm = (): boolean => {
    if (!buyerContactName.trim()) {
      setSubmitError('Buyer contact person name is required.');
      return false;
    }
    const cleanPhone = buyerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setSubmitError('A valid 10-digit mobile contact number is required for farmer order coordination.');
      return false;
    }
    if (cleanPhone === '1234567890' || cleanPhone === '0000000000') {
      setSubmitError('Please enter a genuine mobile contact number.');
      return false;
    }
    if (!companyName.trim()) {
      setSubmitError('Company or Consumer Group name is required.');
      return false;
    }
    if (!destinationName.trim()) {
      setSubmitError('Delivery warehouse / drop-off destination is required.');
      return false;
    }
    if (requiredQuantityKg <= 0) {
      setSubmitError('Required volume must be greater than 0 kg.');
      return false;
    }
    if (maxPricePerKg <= 0) {
      setSubmitError('Maximum offer price must be greater than 0.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    if (isSupabaseConfigured && !user) {
      setSubmitError(t('buyer.signInBeforeRequirement'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Sync updated profile info
      if (isSupabaseConfigured && user) {
        await updateMyProfile({
          fullName: buyerContactName.trim(),
          phone: buyerPhone.trim(),
          companyName: companyName.trim(),
          businessType: buyerType
        });
      }

      if (isSupabaseConfigured) {
        const created = await createBuyerRequirement({
          cropName,
          variety,
          requiredQuantityKg,
          maxPricePerKg,
          preferredQualityGrade,
          deliveryDeadline: new Date(deliveryDeadline).toISOString(),
          destinationName: destinationName.trim(),
          destinationLat: 19.2968,
          destinationLng: 73.0631,
          buyerType,
          status: 'open'
        });

        onAddRequirement(created);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onNavigate(10); // Navigate to Matched Supply & Knapsack Aggregator
      } else {
        // Demo / Local fallback
        const newReq: BuyerRequirement = {
          id: `REQ-${Date.now().toString(36).toUpperCase()}`,
          buyerId: user?.id || profile?.id || 'usr-registered-buyer',
          buyerName: companyName.trim() || buyerContactName.trim(),
          buyerType,
          cropName,
          variety,
          requiredQuantityKg,
          maxPricePerKg,
          preferredQualityGrade,
          deliveryDeadline,
          destinationName: destinationName.trim(),
          destinationLat: 19.2968,
          destinationLng: 73.0631,
          status: 'open',
          createdAt: new Date().toISOString()
        };

        onAddRequirement(newReq);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onNavigate(10);
      }
    } catch (err: any) {
      console.error('[CreateRequirement] Submission error:', err);
      setSubmitError(err?.message || t('buyer.saveRequirementError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">{t('buyer.newBuyingRequirement')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('buyer.publishBulkRequirement')}
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            {t('buyer.requirementDescription')}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Buyer Mandatory Contact Info Section */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
              <Building2 className="w-4 h-4 text-blue-700" /> Compulsory Buyer Organization & Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company / Retailer / FPO Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Reliance Retail Fresh Ltd"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Officer Name *</label>
                <input
                  type="text"
                  required
                  value={buyerContactName}
                  onChange={(e) => setBuyerContactName(e.target.value)}
                  placeholder="e.g. Atheem Khan"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Officer Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+91 98201 54321"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('buyer.buyerCategory')} *</label>
                <select
                  value={buyerType}
                  onChange={(e) => setBuyerType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                >
                  <option value="Modern Retailer">Modern Retailer (Reliance, BigBasket, More)</option>
                  <option value="Food Processor">Food Processor (Ketchup, Chips, Puree)</option>
                  <option value="Hotel/Restaurant">Hotel / Restaurant / Cloud Kitchen</option>
                  <option value="Consumer Group Hub">Consumer Group Buying Hub (Society Pool)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('buyer.cropRequired')} *</label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              >
                <option value="Tomato">🍅 Tomato</option>
                <option value="Onion">🧅 Onion</option>
                <option value="Potato">🥔 Potato</option>
                <option value="Desi Chana (Bengal Gram)">🌱 Desi Chana (Bengal Gram)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('buyer.preferredVariety')} *</label>
              <input
                type="text"
                required
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('buyer.targetBulkVolume')} (kg) *</label>
              <input
                type="number"
                min="100"
                step="50"
                required
                value={requiredQuantityKg}
                onChange={(e) => setRequiredQuantityKg(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                {(requiredQuantityKg / 1000).toFixed(1)} {t('buyer.metricTonnes')} ({(requiredQuantityKg / 100).toFixed(0)} Quintals)
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('buyer.maxOfferPrice')} (₹/kg) *</label>
              <input
                type="number"
                step="0.5"
                required
                value={maxPricePerKg}
                onChange={(e) => setMaxPricePerKg(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-emerald-700 font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                {t('buyer.totalBudget')}: ₹{(requiredQuantityKg * maxPricePerKg).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('buyer.qualityGradeStandard')}</label>
              <select
                value={preferredQualityGrade}
                onChange={(e) => setPreferredQualityGrade(e.target.value as QualityGrade)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              >
                <option value="Grade A">Grade A (Strict Standard / Direct Consumer Shelf)</option>
                <option value="Grade B">Grade B (Standard Commercial)</option>
                <option value="Grade C">Grade C (Industrial Processing)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('buyer.fulfillmentDeadline')} *</label>
              <input
                type="date"
                required
                value={deliveryDeadline}
                onChange={(e) => setDeliveryDeadline(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">{t('buyer.destinationDropoff')} *</label>
            <input
              type="text"
              required
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
              placeholder="e.g. Bhiwandi Central Logistics Fulfillment Depot"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{t('buyer.savingRequirement')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{t('buyer.findMatchingSupply')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
