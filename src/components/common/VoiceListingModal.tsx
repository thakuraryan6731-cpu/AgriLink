import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { CropListing, VoiceListingExtract } from '../../types';
import { parseVoiceTranscript } from '../../lib/voiceParser';
import { SAMPLE_VOICE_PROMPTS } from '../../lib/mockData';
import { useAuth } from '../../context/AuthContext';
import { createCropListing } from '../../services/dbService';
import { isSupabaseConfigured } from '../../lib/supabase';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface VoiceListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddListing: (listing: CropListing) => void;
}

export const VoiceListingModal: React.FC<VoiceListingModalProps> = ({
  isOpen,
  onClose,
  onAddListing
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extractedData, setExtractedData] = useState<VoiceListingExtract | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'Hindi' | 'Marathi' | 'Telugu' | 'English'>('Hindi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [benchmarkPrice, setBenchmarkPrice] = useState(19.0);


  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setTranscript('');
      setExtractedData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateSample = (sample: typeof SAMPLE_VOICE_PROMPTS[0]) => {
    setIsRecording(true);
    setTranscript('');
    setExtractedData(null);
    setIsProcessing(true);

    setTimeout(() => {
      setTranscript(sample.transcript);
      setIsRecording(false);
      setIsProcessing(false);
      const parsed = parseVoiceTranscript(sample.transcript);
      setExtractedData(parsed);

      // Set Agmarknet benchmark
      if (parsed.cropName === 'Onion') setBenchmarkPrice(22.5);
      else if (parsed.cropName === 'Potato') setBenchmarkPrice(16.8);
      else if (parsed.cropName === 'Desi Chana (Bengal Gram)') setBenchmarkPrice(56.5);
      else setBenchmarkPrice(19.0);
    }, 1200);
  };

  const handleLiveMicToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      if (transcript) {
        const parsed = parseVoiceTranscript(transcript);
        setExtractedData(parsed);
      }
      return;
    }

    // Attempt Web Speech API if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = selectedLanguage === 'Hindi' ? 'hi-IN' : selectedLanguage === 'Marathi' ? 'mr-IN' : selectedLanguage === 'Telugu' ? 'te-IN' : 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          setTranscript('');
          setExtractedData(null);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
          const parsed = parseVoiceTranscript(text);
          setExtractedData(parsed);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('SpeechRecognition initialization failed, using sample demo.');
      }
    }

    // Fallback simulation for selected language
    const sample = SAMPLE_VOICE_PROMPTS.find((s) => s.language === selectedLanguage) || SAMPLE_VOICE_PROMPTS[0];
    handleSimulateSample(sample);
  };

  const handlePublishListing = async () => {
    if (!extractedData) return;

    setIsPublishing(true);
    setPublishError(null);
    try {
      if (isSupabaseConfigured && user) {
        const created = await createCropListing({
          cropName: extractedData.cropName,
          variety: extractedData.variety,
          quantityKg: extractedData.quantityKg,
          askingPricePerKg: extractedData.askingPricePerKg,
          mandiBenchmarkPrice: benchmarkPrice,
          qualityGrade: extractedData.qualityGrade,
          harvestDate: extractedData.harvestDate,
          locationName: extractedData.locationName || `${profile?.district || 'Nashik'} Cluster`,
          latitude: profile?.latitude ?? 20.0059,
          longitude: profile?.longitude ?? 73.7898,
          status: 'available',
          photoUrls: [],
        });
        onAddListing(created);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        onClose();
      } else {
        const newListing: CropListing = {
          id: `LIST-${Date.now().toString(36).toUpperCase()}`,
          farmerId: user?.id || profile?.id || 'usr-registered-farmer',
          farmerName: profile?.fullName || user?.email || 'Farmer Partner',
          phone: profile?.phone || '',
          cropName: extractedData.cropName,
          variety: extractedData.variety,
          quantityKg: extractedData.quantityKg,
          askingPricePerKg: extractedData.askingPricePerKg,
          mandiBenchmarkPrice: benchmarkPrice,
          qualityGrade: extractedData.qualityGrade,
          harvestDate: extractedData.harvestDate,
          locationName: extractedData.locationName || `${profile?.district || 'Nashik'}, ${profile?.state || 'Maharashtra'}`,
          district: profile?.district || 'Nashik',
          state: profile?.state || 'Maharashtra',
          latitude: profile?.latitude ?? 20.0059,
          longitude: profile?.longitude ?? 73.7898,
          status: 'available',
          createdAt: new Date().toISOString(),
        };

        onAddListing(newListing);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        onClose();
      }
    } catch (err: any) {
      console.error('[VoiceListingModal] Publish error:', err);
      setPublishError(err?.message || 'Failed to publish listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };


  return (
    <div className="voice-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-emerald-950/50 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                {t('voice.title')}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {t('common.voice')}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('voice.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Language Sample Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              {t('voice.languagePrompt')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_VOICE_PROMPTS.map((sample) => (
                <button
                  key={sample.language}
                  onClick={() => {
                    setSelectedLanguage(sample.language as any);
                    handleSimulateSample(sample);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${selectedLanguage === sample.language
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                >
                  <span className="font-medium truncate">{sample.label}</span>
                  <Play className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Microphone Live Interactive Area */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center relative overflow-hidden">
            <div className="mb-4">
              <button
                onClick={handleLiveMicToggle}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 scale-110 animate-pulse'
                    : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/30 hover:scale-105'
                  }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-200">
              {isRecording ? t('voice.listening', { language: selectedLanguage }) : t('voice.tapMic')}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {t('voice.subtitle')}
            </p>

            {/* Simulated Animated Waveform */}
            {isRecording && (
              <div className="flex items-center gap-1 mt-4 h-6">
                {[40, 75, 100, 60, 90, 45, 80, 100, 65, 30, 85, 95, 50].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full animate-pulse"
                    style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
                  ></span>
                ))}
              </div>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1 font-mono text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Volume2 className="w-3.5 h-3.5" /> {t('voice.details')} ({extractedData?.detectedLanguage || selectedLanguage})
                </span>
                <span>{t('voice.publish')}</span>
              </div>
              <p className="text-slate-100 font-medium italic">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {/* Extracted Structured Schema Preview */}
          {extractedData && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" /> {t('voice.details')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {t('voice.publish')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Crop & Variety</span>
                  <span className="font-bold text-white text-sm">{extractedData.cropName}</span>
                  <span className="text-[11px] text-emerald-400 block">{extractedData.variety}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Total Quantity</span>
                  <span className="font-bold text-white text-sm">{extractedData.quantityKg} kg</span>
                  <span className="text-[11px] text-slate-400 block">{(extractedData.quantityKg / 100).toFixed(1)} Quintals</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Asking Price</span>
                  <span className="font-bold text-emerald-400 text-sm">₹{extractedData.askingPricePerKg.toFixed(2)}/kg</span>
                  <span className="text-[10px] text-slate-400 block">Mandi: ₹{benchmarkPrice.toFixed(2)}/kg</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Quality Grade</span>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mt-0.5">
                    {extractedData.qualityGrade}
                  </span>
                </div>
              </div>

              {/* Benchmark Comparison Notice */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-slate-300 font-medium">Agmarknet Benchmark Advantage:</span>
                    <span className="text-emerald-400 font-bold ml-1.5">
                      +₹{(extractedData.askingPricePerKg - benchmarkPrice).toFixed(2)}/kg (+
                      {(((extractedData.askingPricePerKg - benchmarkPrice) / benchmarkPrice) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Nashik APMC Feed</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => {
              setTranscript('');
              setExtractedData(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              disabled={!extractedData}
              onClick={handlePublishListing}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-green-500 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Publish Listing to AgriLink
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
