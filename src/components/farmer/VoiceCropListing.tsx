import React, { useState, useEffect } from 'react';
import {
  Mic,
  Sprout,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  Info,
  DollarSign,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  User,
  Phone
} from 'lucide-react';
import { CropListing, QualityGrade } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createCropListing, uploadProducePhoto, updateMyProfile } from '../../services/dbService';
import { isSupabaseConfigured } from '../../lib/supabase';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface VoiceCropListingProps {
  onAddListing: (listing: CropListing) => void;
  onOpenVoiceModal: () => void;
  onNavigate: (screen: number) => void;
}

export const VoiceCropListing: React.FC<VoiceCropListingProps> = ({
  onAddListing,
  onOpenVoiceModal,
  onNavigate
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  
  // Produce specs
  const [cropName, setCropName] = useState('Tomato');
  const [variety, setVariety] = useState('Vaishali Hybrid');
  const [quantityKg, setQuantityKg] = useState<number>(750);
  const [askingPricePerKg, setAskingPricePerKg] = useState<number>(24.5);
  const [qualityGrade, setQualityGrade] = useState<QualityGrade>('Grade A');
  const [harvestDate, setHarvestDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [locationName, setLocationName] = useState('Pimpalgaon Baswant');
  
  // Mandatory contact details
  const [farmerName, setFarmerName] = useState(profile?.fullName || '');
  const [farmerPhone, setFarmerPhone] = useState(profile?.phone || '');
  const [district, setDistrict] = useState(profile?.district || 'Nashik');
  const [state, setState] = useState(profile?.state || 'Maharashtra');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      if (!farmerName && profile.fullName) setFarmerName(profile.fullName);
      if (!farmerPhone && profile.phone) setFarmerPhone(profile.phone);
      if (profile.district) setDistrict(profile.district);
      if (profile.state) setState(profile.state);
    }
  }, [profile]);

  const mandiBenchmark = cropName === 'Onion' ? 22.5 : cropName === 'Potato' ? 16.8 : cropName === 'Desi Chana (Bengal Gram)' ? 56.5 : 19.0;
  const priceAdvantage = askingPricePerKg - mandiBenchmark;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setPhotoFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!farmerName.trim()) {
      setSubmitError('Farmer name is required.');
      return false;
    }
    const cleanPhone = farmerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setSubmitError('A valid 10-digit mobile contact number is required for buyer coordination.');
      return false;
    }
    if (cleanPhone === '1234567890' || cleanPhone === '0000000000') {
      setSubmitError('Please enter your genuine contact mobile number.');
      return false;
    }
    if (!district.trim()) {
      setSubmitError('Farm district is required.');
      return false;
    }
    if (!locationName.trim()) {
      setSubmitError('Farm village / location is required.');
      return false;
    }
    if (quantityKg <= 0) {
      setSubmitError('Quantity must be greater than 0 kg.');
      return false;
    }
    if (askingPricePerKg <= 0) {
      setSubmitError('Asking price must be greater than 0.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    if (isSupabaseConfigured && !user) {
      setSubmitError('Please sign in before publishing a listing.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Sync updated profile info to database
      if (isSupabaseConfigured && user) {
        await updateMyProfile({
          fullName: farmerName.trim(),
          phone: farmerPhone.trim(),
          district: district.trim(),
          state: state.trim()
        });
      }

      // 2. Upload photos if any
      const uploadedUrls: string[] = [];
      for (const file of photoFiles) {
        try {
          const url = await uploadProducePhoto(file);
          if (url) uploadedUrls.push(url);
        } catch (photoErr) {
          console.warn('[VoiceCropListing] Photo upload warning:', photoErr);
        }
      }

      if (isSupabaseConfigured) {
        const created = await createCropListing({
          cropName,
          variety,
          quantityKg,
          askingPricePerKg,
          mandiBenchmarkPrice: mandiBenchmark,
          qualityGrade,
          harvestDate,
          locationName: `${locationName.trim()}, ${district.trim()}`,
          latitude: profile?.latitude ?? (20.0059 + (Math.random() - 0.5) * 0.05),
          longitude: profile?.longitude ?? (73.7898 + (Math.random() - 0.5) * 0.05),
          status: 'available',
          photoUrls: uploadedUrls.length > 0 ? uploadedUrls : photoPreviews,
        });
        onAddListing(created);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onNavigate(4); // Navigate to buyer match ranking
      } else {
        // Offline / Demo fallback
        const newListing: CropListing = {
          id: `LIST-${Date.now().toString(36).toUpperCase()}`,
          farmerId: user?.id || profile?.id || 'usr-registered-farmer',
          farmerName: farmerName.trim(),
          phone: farmerPhone.trim(),
          cropName,
          variety,
          quantityKg,
          askingPricePerKg,
          mandiBenchmarkPrice: mandiBenchmark,
          qualityGrade,
          harvestDate,
          locationName: `${locationName.trim()}, ${district.trim()}`,
          district: district.trim(),
          state: state.trim(),
          latitude: profile?.latitude ?? (20.0059 + (Math.random() - 0.5) * 0.05),
          longitude: profile?.longitude ?? (73.7898 + (Math.random() - 0.5) * 0.05),
          status: 'available',
          createdAt: new Date().toISOString(),
          photoUrls: photoPreviews,
        };

        onAddListing(newListing);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onNavigate(4);
      }
    } catch (err: any) {
      console.error('[VoiceCropListing] Submission error:', err);
      setSubmitError(err?.message || 'We could not save your listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-900 via-green-900 to-slate-900 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">{t('nav.listProduce')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            List Fresh Farm Produce
          </h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl leading-relaxed">
            Input produce details and farm contact information to connect directly with regional bulk buyers and consumer groups.
          </p>
        </div>

        <button
          onClick={onOpenVoiceModal}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-lg whitespace-nowrap"
        >
          <Mic className="w-4 h-4 animate-pulse text-white" />
          <span>{t('farmer.voiceListing')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listing Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600" /> Produce Specification & Contact Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Farmer Contact Info Section */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                <User className="w-4 h-4 text-emerald-700" /> Compulsory Farmer Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Farmer / Producer Name *</label>
                  <input
                    type="text"
                    required
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Rameshwar Patil"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value)}
                    placeholder="+91 98224 10923"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Nashik"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Produce Variety */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.cropVariety')} *</label>
                <select
                  value={cropName}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCropName(c);
                    if (c === 'Tomato') {
                      setVariety('Vaishali Hybrid');
                      setAskingPricePerKg(24.5);
                    } else if (c === 'Onion') {
                      setVariety('Nashik Red Garwa');
                      setAskingPricePerKg(28.0);
                    } else if (c === 'Potato') {
                      setVariety('Kufri Jyoti Chipsona');
                      setAskingPricePerKg(21.0);
                    } else if (c === 'Desi Chana (Bengal Gram)') {
                      setVariety('Digvijay Bold');
                      setAskingPricePerKg(64.0);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
                >
                  <option value="Tomato">🍅 Tomato (टमाटर)</option>
                  <option value="Onion">🧅 Onion (कांदा / प्याज)</option>
                  <option value="Potato">🥔 Potato (बटाटा / आलू)</option>
                  <option value="Desi Chana (Bengal Gram)">🌱 Desi Chana (चना / हरभरा)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Specific Variety *</label>
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
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.quantity')} (kg) *</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  required
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Equivalent to {(quantityKg / 100).toFixed(1)} Quintals ({(quantityKg / 1000).toFixed(2)} Tonnes)
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.askingPrice')} (₹/kg) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={askingPricePerKg}
                  onChange={(e) => setAskingPricePerKg(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-emerald-700 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                  Expected gross realization: ₹{(quantityKg * askingPricePerKg).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.qualityGrade')}</label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value as QualityGrade)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
                >
                  <option value="Grade A">Grade A (Premium / Export / Uniform Size)</option>
                  <option value="Grade B">Grade B (Standard Market / Minor Variation)</option>
                  <option value="Grade C">Grade C (Processing / Sauce / Juice Grade)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.harvestDate')} *</label>
                <input
                  type="date"
                  required
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Farm Village / Landmark *</label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Pimpalgaon Baswant"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              />
            </div>

            {/* Produce Photos Upload UI */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Produce Photos (JPG / PNG / WebP)</label>
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 bg-slate-50 transition">
                <input
                  type="file"
                  id="produce-photo-input"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <label
                  htmlFor="produce-photo-input"
                  className="flex flex-col items-center justify-center cursor-pointer py-3"
                >
                  <UploadCloud className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-slate-800">
                    Click to select farm produce photos
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Images will be displayed directly to bulk buyers on the Available Produce board
                  </span>
                </label>
              </div>

              {/* Photos Preview Grid */}
              {photoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photoPreviews.map((previewUrl, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border border-slate-200 group h-24 bg-slate-100">
                      <img
                        src={previewUrl}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving produce listing to database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Publish Produce Listing</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Real-time Pricing Summary Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Agmarknet Mandi Baseline
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                Market benchmark
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Selected Commodity:</span>
                <span className="font-bold text-slate-900">{cropName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>APMC Benchmark Price:</span>
                <span className="font-bold text-slate-800">₹{mandiBenchmark.toFixed(2)}/kg</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Your Asking Price:</span>
                <span className="font-bold text-emerald-700">₹{askingPricePerKg.toFixed(2)}/kg</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-800">Farmer Price Premium:</span>
                <span className="text-emerald-700 font-bold">
                  +{priceAdvantage >= 0 ? `₹${priceAdvantage.toFixed(2)}` : `-₹${Math.abs(priceAdvantage).toFixed(2)}`}/kg
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Direct Disintermediation Value
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                In standard APMC mandis, commission agents take 8–14% cuts plus unpooled transport costs. AgriLink matches you directly with corporate bulk buyers to protect full net realization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
