import React, { useState } from 'react';
import {
  Sprout, LayoutDashboard, Mic, Bot, UserCheck, LogOut, Lock,
  BarChart3, Users, ClipboardList, PackageCheck, Truck, Map,
  ShieldCheck, ChevronRight, Menu, X, MessageSquare
} from 'lucide-react';
import { UserRole } from '../../types';
import { ROLE_ALLOWED_SCREENS } from '../../lib/rbac';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/translations';

interface NavbarProps {
  currentRole: UserRole | null;
  setRole: (role: UserRole) => void;
  activeScreen: number;
  setActiveScreen: (screen: number) => void;
  onOpenVoiceModal: () => void;
  onOpenAICopilot: () => void;
  onOpenFarmerChat?: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const NAV_ITEMS: Record<number, { key: string; icon: React.ElementType }> = {
  1: { key: 'nav.overview', icon: LayoutDashboard }, 2: { key: 'nav.listProduce', icon: Mic },
  3: { key: 'nav.marketInsights', icon: BarChart3 }, 4: { key: 'nav.buyerConnections', icon: Users },
  5: { key: 'nav.activeOrders', icon: ClipboardList }, 6: { key: 'nav.earnings', icon: BarChart3 },
  7: { key: 'nav.buyerOverview', icon: LayoutDashboard }, 8: { key: 'nav.newRequirement', icon: ClipboardList },
  9: { key: 'nav.availableProduce', icon: PackageCheck }, 10: { key: 'nav.supplyLot', icon: PackageCheck },
  11: { key: 'nav.ordersContracts', icon: ClipboardList }, 12: { key: 'nav.fleetOverview', icon: Truck },
  13: { key: 'nav.routePlanner', icon: Map }, 14: { key: 'nav.deliveryTracking', icon: Truck },
  15: { key: 'nav.marketImpact', icon: ShieldCheck },
};

const roleLabel = (role: UserRole | null) => {
  if (role === 'consumer_group') return 'common.roleConsumerGroup';
  if (role === 'bulk_buyer') return 'common.roleBuyer';
  if (role === 'transporter') return 'common.roleLogistics';
  if (role === 'doca_admin') return 'common.roleAdmin';
  if (role === 'fpo_admin') return 'common.roleFpo';
  return 'common.roleFarmer';
};

export const Navbar: React.FC<NavbarProps> = ({
  currentRole, activeScreen, setActiveScreen, onOpenVoiceModal, onOpenAICopilot, onOpenFarmerChat,
  language, setLanguage,
}) => {
  const { profile, user, signOut, setIsAuthModalOpen } = useAuth();
  const { t } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const items = currentRole ? (ROLE_ALLOWED_SCREENS[currentRole] || []) : [];
  const isFarmerOrFpo = currentRole === 'farmer' || currentRole === 'fpo_admin';

  return (
    <>
      <div className="hidden lg:flex fixed top-0 left-64 right-0 z-30 h-16 items-center justify-end gap-3 border-b border-[#e1ebe1] bg-white/95 px-8 shadow-sm backdrop-blur">
        {isFarmerOrFpo && onOpenFarmerChat && (
          <button 
            onClick={onOpenFarmerChat} 
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm" 
            title="Farmer Community Network Chat"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Farmer Network Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        )}
        <button onClick={onOpenVoiceModal} className="inline-flex items-center gap-2 rounded-lg border border-[#dce8dd] px-3 py-2 text-xs font-semibold text-[#376343] hover:bg-[#f1f7f1]" title={t('common.voice')}>
          <Mic className="w-3.5 h-3.5" />
          <span>{t('common.voice')}</span>
        </button>
        <button onClick={onOpenAICopilot} className="inline-flex items-center gap-2 rounded-lg bg-[#edf0ff] px-3 py-2 text-xs font-semibold text-[#4b52a4] hover:bg-[#e3e6ff]" title={t('common.assistant')}>
          <Bot className="w-3.5 h-3.5" />
          <span>{t('common.assistant')}</span>
        </button>
        <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} aria-label={t('common.chooseLanguage')} className="rounded-lg border border-[#dce8dd] bg-white px-2.5 py-2 text-xs font-semibold text-[#526a58]">
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
        {profile && <span className="max-w-[13rem] truncate border-l border-[#e1ebe1] pl-3 text-xs font-semibold text-[#193326]">{profile.fullName}</span>}
        {user ? <button onClick={() => signOut()} title={t('common.logout')} className="rounded-lg border border-[#dce8dd] p-2 text-[#6b8170] hover:bg-[#fff3f3] hover:text-rose-600"><LogOut className="w-4 h-4" /></button> : <button onClick={() => setIsAuthModalOpen(true)} title={t('common.signIn')} className="rounded-lg border border-[#dce8dd] p-2 text-brand-600"><Lock className="w-4 h-4" /></button>}
      </div>

      <aside className="w-full lg:w-64 lg:min-h-screen lg:sticky lg:top-0 z-40 bg-white border-b lg:border-b-0 lg:border-r border-[#e1ebe1] flex lg:flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-[#edf2ed]">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-xl tracking-tight text-[#183126]">AgriLink <span className="text-brand-600">AI</span></div>
            <p className="text-[11px] text-[#6b8170]">{t('common.tagline')}</p>
          </div>
          <button
            type="button"
            aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setIsMobileOpen((open) => !open)}
            className="ml-auto rounded-lg border border-[#dce8dd] p-2 text-[#526a58] lg:hidden"
          >
            {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <div className={`${isMobileOpen ? 'block' : 'hidden'} lg:block px-4 py-4 lg:flex-1`}>
          {profile && (
            <div className="mb-5 rounded-xl bg-[#f1f7f1] p-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center"><UserCheck className="w-4 h-4" /></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-[#183126] truncate">{profile.fullName}</p><p className="text-[11px] text-[#6b8170] truncate">{t(roleLabel(currentRole))}</p></div>
            </div>
          )}

          <p className="hidden lg:block px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#91a493]">Workspace</p>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {items.map((screen) => {
              const item = NAV_ITEMS[screen] || { key: 'common.workspace', icon: LayoutDashboard };
              const Icon = item.icon;
              return (
                <button
                  key={screen}
                  onClick={() => { setActiveScreen(screen); setIsMobileOpen(false); }}
                  className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition ${
                    activeScreen === screen
                      ? 'bg-brand-600 text-white shadow-sm font-semibold'
                      : 'text-[#526a58] hover:bg-[#f1f7f1] hover:text-[#183126]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t(item.key)}</span>
                  {activeScreen === screen && <ChevronRight className="w-3.5 h-3.5 ml-auto hidden lg:block" />}
                </button>
              );
            })}

            {isFarmerOrFpo && onOpenFarmerChat && (
              <button
                onClick={() => { onOpenFarmerChat(); setIsMobileOpen(false); }}
                className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/60 transition mt-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Farmer Chat</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-auto animate-pulse" />
              </button>
            )}
          </nav>
        </div>

        <div className={`${isMobileOpen ? 'flex' : 'hidden'} lg:flex px-4 pb-4 flex-wrap lg:flex-col gap-2`}>
          <div className="flex gap-2">
            <button onClick={onOpenVoiceModal} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#dce8dd] px-3 py-2 text-xs font-semibold text-[#376343] hover:bg-[#f1f7f1]"><Mic className="w-3.5 h-3.5" /> {t('common.voice')}</button>
            <button onClick={onOpenAICopilot} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#edf0ff] px-3 py-2 text-xs font-semibold text-[#4b52a4] hover:bg-[#e3e6ff]"><Bot className="w-3.5 h-3.5" /> {t('common.assistant')}</button>
          </div>
          <div className="flex items-center gap-2">
            <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'mr')} aria-label={t('common.chooseLanguage')} className="flex-1 bg-white border border-[#dce8dd] text-xs rounded-lg px-2 py-2 text-[#526a58]"><option value="en">English</option><option value="hi">हिंदी</option><option value="mr">मराठी</option></select>
            {user ? <button onClick={() => signOut()} title={t('common.logout')} className="p-2 rounded-lg border border-[#dce8dd] text-[#6b8170] hover:text-rose-600"><LogOut className="w-4 h-4" /></button> : <button onClick={() => setIsAuthModalOpen(true)} title={t('common.signIn')} className="p-2 rounded-lg border border-[#dce8dd] text-brand-600"><Lock className="w-4 h-4" /></button>}
          </div>
        </div>
      </aside>
    </>
  );
};
