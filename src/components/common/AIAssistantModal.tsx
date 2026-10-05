import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  X,
  TrendingUp,
  Truck,
  ShieldCheck,
  User,
  Calculator,
  CornerDownLeft
} from 'lucide-react';
import { generateGroundedAIResponse } from '../../lib/voiceParser';
import { useLanguage } from '../../i18n/LanguageContext';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  cropContext?: string;
  mandiPrice?: number;
  highestNetRealization?: number;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  cropContext = 'Tomato',
  mandiPrice = 19.0,
  highestNetRealization = 26.85
}) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Namaste! I am your **AgriLink farm assistant**.

I can help you understand:
• **Estimated earnings:** What you may take home after transport and expected spoilage.
• **Pickup planning:** How shared collections can reduce unnecessary empty trips.
• **Market alerts:** Commodity availability and price movement in your area.

How can I assist your farm-to-market decisions today?`,
      time: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    '🌾 Where should I sell my 650 kg tomatoes today?',
    '🚚 How can shared pickups reduce transport costs?',
    '🏛️ Show essential commodity alerts',
    '📊 Explain how earnings are estimated'
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    setTimeout(() => {
      let aiText = '';
      if (query.toLowerCase().includes('equation') || query.toLowerCase().includes('formula')) {
        aiText = `📐 **How your estimated earnings are worked out:**

1. **Estimated earnings:**
$$NR_i = P_{\\text{offer}, i} - \\left( \\frac{C_{\\text{fuel}} \\times D_i + C_{\\text{handling}}}{Q_{\\text{farmer}}} \\right) - S(D_i)$$
*Where $S(D_i) = \\text{₹0.05/kg per 50 km}$ perishability penalty.*

2. **Buyer fit:**
$$S_{\\text{match}} = 0.30(C_{\\text{crop}}) + 0.20(S_{\\text{qty}}) + 0.20(S_{\\text{price}}) + 0.15(S_{\\text{dist}}) + 0.10(S_{\\text{qual}}) + 0.05(S_{\\text{feas}})$$

3. **Shared pickup planning:**
$$\\min \\sum_{k} \\sum_{i,j} c_{ij} x_{ijk} \\quad \\text{s.t.} \\sum_{i} q_i \\le Q_{\\text{vehicle}}$$`;
      } else {
        aiText = generateGroundedAIResponse(query, {
          crop: cropContext,
          mandiPrice,
          highestNetRealization,
          recommendedBuyer: 'Reliance Fresh Distribution Center, Bhiwandi',
          fuelSaved: 4348,
          docaAlerts: 3
        });
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 700);
  };

  return (
    <div className="ai-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                {t('ai.title')}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  {t('common.assistant')}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('ai.subtitle')}
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

        {/* Quick prompt suggestions */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-purple-300 font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> {t('common.suggestions')}:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] whitespace-nowrap hover:bg-purple-950 hover:text-purple-200 border border-slate-700 transition"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Chat message stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none'
                  }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className={`text-[9px] mt-1.5 font-mono ${msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'}`}>
                  {msg.time}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-purple-300">
              <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                {t('ai.loading')}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t('ai.placeholder')}
            className="flex-1 bg-slate-900 border border-slate-700 text-xs rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:from-purple-500 hover:to-indigo-500 transition shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <span>{t('common.send')}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
