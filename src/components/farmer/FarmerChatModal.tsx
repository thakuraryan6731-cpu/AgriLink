import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Send, X, User, CheckCircle2, 
  ShieldAlert, Sparkles, AlertCircle, RefreshCw, Users, Sprout
} from 'lucide-react';
import { FarmerCommunityMessage } from '../../types';
import { 
  getFarmerCommunityMessages, 
  sendFarmerCommunityMessage, 
  subscribeToFarmerCommunityMessages 
} from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

interface FarmerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FarmerChatModal: React.FC<FarmerChatModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, profile, role } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<FarmerCommunityMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RBAC check: strictly farmers and fpo_admins only
  const currentRole = role || profile?.role || (user?.user_metadata?.role as any);
  const currentUserId = user?.id || profile?.id;
  const isAuthorized = currentRole === 'farmer' || currentRole === 'fpo_admin';

  const loadCommunityMessages = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setSendError(null);
    try {
      const msgs = await getFarmerCommunityMessages();
      setMessages(msgs);
    } catch (err) {
      console.error('[Farmer Community Chat] Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  // Initial load when opened
  useEffect(() => {
    if (isOpen && isAuthorized) {
      loadCommunityMessages();
    }
  }, [isOpen, isAuthorized, loadCommunityMessages]);

  // Realtime Supabase Subscription
  useEffect(() => {
    if (!isOpen || !isAuthorized) return;

    const sub = subscribeToFarmerCommunityMessages((incomingMsg) => {
      setMessages((prev) => {
        // Prevent duplicate messages if already present
        if (prev.some((m) => m.id === incomingMsg.id)) return prev;
        return [...prev, incomingMsg];
      });
    });

    return () => {
      sub.unsubscribe();
    };
  }, [isOpen, isAuthorized]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || sending || !isAuthorized) return;

    setSending(true);
    setSendError(null);
    const textToSend = newMessageText.trim();

    try {
      const sent = await sendFarmerCommunityMessage(textToSend);
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
        setNewMessageText('');
      }
    } catch (err: any) {
      console.error('[Farmer Community Chat] Send error:', err);
      setSendError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  // Access Denied Screen for non-farmer roles
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-200 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Farmer-Only Community Channel</h3>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Access to the open farmer community stream is strictly reserved for registered Farmers and FPO Administrators. Bulk buyers, consumer hubs, and logistics partners cannot participate in this channel.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-800 to-green-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Farmer & FPO Community Stream</h2>
                <span className="text-[10px] bg-emerald-500/30 border border-emerald-300/40 text-white px-2 py-0.5 rounded-full font-semibold">
                  Realtime Broadcast
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Shared regional updates, harvest planning, pooling coordination, and market insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadCommunityMessages}
              title="Refresh messages"
              className="p-2 hover:bg-white/10 rounded-full text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Community Info Banner */}
        <div className="px-6 py-2.5 bg-emerald-50/70 border-b border-emerald-100 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Sprout className="w-4 h-4 text-emerald-700" />
            <span>
              Connected as <strong className="font-bold text-emerald-950">{profile?.fullName || user?.email || 'Farmer'}</strong> ({profile?.district || 'Regional'} Cluster)
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8faf8]">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Connecting to farmer community stream...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-2">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No community messages yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Be the first to post a market update, coordinate crop aggregation, or share harvest status with regional growers.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    {msg.senderDistrict && (
                      <span>• {msg.senderDistrict}</span>
                    )}
                    {msg.senderFpoName && (
                      <span className="text-emerald-700 font-semibold">• {msg.senderFpoName}</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-emerald-700 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          {sendError && (
            <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Share harvest status, pooling availability, or market rates with community..."
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newMessageText.trim() || sending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
