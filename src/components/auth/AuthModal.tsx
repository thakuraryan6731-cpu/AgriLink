import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  MapPin,
  Building2,
  Sprout,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithDemoPersona, enableDemoPersonas } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  const [district, setDistrict] = useState('Nashik');
  const [state, setState] = useState('Maharashtra');
  const [fpoName, setFpoName] = useState('Sahyadri Farmers Producer Co.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab('login');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        if (!email || !password) {
          setErrorMsg('Both email and password are required.');
          setIsSubmitting(false);
          return;
        }
        const { error } = await signIn(email, password);
        if (error) {
          const errCode = (error as any).code || error.name || 'unknown';
          const errStatus = (error as any).status || '';
          const errMsg = error.message || 'Login failed.';

          if (errCode === 'email_not_confirmed' || errMsg.toLowerCase().includes('email not confirmed')) {
            setErrorMsg(`⚠️ Email not confirmed. Check your inbox and click the confirmation link before signing in.`);
          } else if (errCode === 'invalid_credentials' || errMsg.toLowerCase().includes('invalid login credentials')) {
            setErrorMsg(`❌ Invalid credentials. The email or password is incorrect. Please sign up first if you haven't registered yet.\n\nError: ${errMsg} [code: ${errCode}, status: ${errStatus}]`);
          } else {
            setErrorMsg(`Login error: ${errMsg}\n[code: ${errCode}, status: ${errStatus}]`);
          }
        } else {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          onClose();
        }
      } else {
        if (!email || !password) {
          setErrorMsg('Email and password are required to register.');
          setIsSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, {
          fullName,
          phone,
          role: selectedRole,
          district,
          state,
          fpoName: selectedRole === 'farmer' || selectedRole === 'fpo_admin' ? fpoName : undefined,
        });
        if (error) {
          const errCode = (error as any).code || error.name || 'unknown';
          const errMsg = error.message || 'Registration failed.';
          if (errCode === 'email_confirmation_pending') {
            // This is actually a success — show green message
            setSuccessMsg(errMsg);
          } else {
            setErrorMsg(`Registration error: ${errMsg} [code: ${errCode}]`);
          }
        } else {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoRoles = [
    { role: 'farmer' as UserRole, label: '👨🌾 Rameshwar Patil (Farmer/FPO)', desc: 'Nashik Cluster • 650kg Tomatoes', icon: Sprout, color: 'hover:border-emerald-400 hover:bg-emerald-50' },
    { role: 'bulk_buyer' as UserRole, label: '🏢 Reliance Fresh DC (Buyer)', desc: 'Bhiwandi Hub • 1,500kg Demand', icon: ShoppingBag, color: 'hover:border-blue-400 hover:bg-blue-50' },
    { role: 'transporter' as UserRole, label: '🚚 MahaKisan Logistics', desc: 'Fleet operations • Nashik', icon: Truck, color: 'hover:border-amber-400 hover:bg-amber-50' },
    { role: 'doca_admin' as UserRole, label: '🏛️ Dr. Vivek Saraf (DoCA Admin)', desc: 'National Price & Deficit Radar', icon: ShieldCheck, color: 'hover:border-purple-400 hover:bg-purple-50' },
  ];

  return (
    <div className="auth-modal fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4 bg-[#183126]/45 backdrop-blur-sm">
      <div className="relative my-0 sm:my-4 w-full max-w-2xl bg-white border border-[#dce8dd] rounded-2xl shadow-[0_24px_70px_rgba(24,49,38,0.2)] overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#e7efe7] bg-[#fbfdfb] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e4f3e5] text-brand-700 border border-[#cfe0d0] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-[#183126]">
                {t('auth.welcome')}
              </h3>
              <p className="text-xs text-[#647a68] mt-0.5">
                {t('auth.supporting')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer shrink-0 p-2 text-[#647a68] hover:text-[#183126] rounded-lg hover:bg-[#edf5ed] active:bg-[#e4f3e5] transition focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Quick Demo Personas (1-Click Switcher for Evaluators - only visible when enabled) */}
          {enableDemoPersonas && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#376343] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" /> {t('common.workspace')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {demoRoles.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => {
                          signInWithDemoPersona(item.role);
                          confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
                          onClose();
                        }}
                        className={`cursor-pointer p-3 rounded-xl border border-[#dce8dd] bg-white text-left transition flex items-center gap-2.5 hover:bg-[#f7faf6] focus:outline-none focus:ring-2 focus:ring-brand-500 ${item.color}`}
                      >
                        <Icon className="w-4 h-4 text-[#376343] flex-shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#183126] block truncate">{item.label}</span>
                          <span className="text-[10px] text-[#647a68] block truncate">{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#dce8dd]"></div>
                <span className="flex-shrink mx-3 text-xs text-[#769078] uppercase">{t('auth.supporting')}</span>
                <div className="flex-grow border-t border-[#dce8dd]"></div>
              </div>
            </>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center bg-[#f1f7f1] p-1 rounded-xl border border-[#dce8dd] text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`cursor-pointer flex-1 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-brand-500 ${tab === 'login' ? 'bg-brand-600 !text-white shadow-sm' : 'text-[#526a58] hover:text-[#183126] hover:bg-white'}`}
            >
              {t('common.signIn')}
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`cursor-pointer flex-1 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-brand-500 ${tab === 'signup' ? 'bg-brand-600 !text-white font-bold shadow-sm' : 'text-[#526a58] hover:text-[#183126] hover:bg-white'}`}
            >
              {t('common.signUp')}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#fff1f1] border border-[#f2caca] text-xs text-[#9b2c2c] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#c24141]" />
              <span className="whitespace-pre-wrap break-words">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#edf8ef] border border-[#b9dfbf] text-xs text-[#276437] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-600" />
              <span className="whitespace-pre-wrap break-words">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {tab === 'signup' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#294b35] font-medium mb-1.5">{t('auth.fullName')}</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('auth.fullName')}
                      className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[#294b35] font-medium mb-1.5">{t('auth.phone')}</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98224 10923"
                      className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#294b35] font-medium mb-1.5">{t('auth.accountType')}</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 font-medium"
                  >
                    <option value="farmer">👨🌾 Farmer / Producer</option>
                    <option value="fpo_admin">🏢 FPO Administrator / Aggregator</option>
                    <option value="bulk_buyer">🏭 Bulk Enterprise Buyer (Retailer/Processor)</option>
                    <option value="consumer_group">🛒 Consumer Group Buying Hub</option>
                    <option value="transporter">🚚 Logistics partner</option>
                  </select>
                  <span className="text-xs text-[#769078] block mt-1.5">
                    {t('auth.docaNote')}
                  </span>
                </div>

                {(selectedRole === 'farmer' || selectedRole === 'fpo_admin') && (
                  <div>
                    <label className="block text-[#294b35] font-medium mb-1.5">FPO Affiliation Name</label>
                    <input
                      type="text"
                      value={fpoName}
                      onChange={(e) => setFpoName(e.target.value)}
                      placeholder="Sahyadri Farmers Producer Co."
                      className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#294b35] font-medium mb-1.5">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[#294b35] font-medium mb-1.5">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[#294b35] font-medium mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-[#294b35] font-medium mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#cbdccc] rounded-xl px-3 py-2.5 text-[#183126] placeholder:text-[#91a493] focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer w-full py-3 rounded-xl bg-brand-600 !text-white font-bold text-sm hover:bg-brand-700 active:bg-brand-800 transition shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>              {isSubmitting ? 'Processing...' : tab === 'login' ? t('auth.submitLogin') : t('auth.createAccount')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
