import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS } from '../lib/mockData';

export const ENABLE_DEMO_PERSONAS = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_DEMO_PERSONAS === 'true');

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  profileError: string | null;
  enableDemoPersonas: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  signInWithDemoPersona: (targetRole: UserRole) => void;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, profileData: Partial<UserProfile>) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_PERSONA_KEY = 'agrilink_demo_persona_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if real Supabase session is active
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchSupabaseProfile(session.user.id);
        } else {
          setUser(null);
          loadStoredPersonaOrDefault();
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchSupabaseProfile(session.user.id);
        } else {
          setUser(null);
          loadStoredPersonaOrDefault();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      loadStoredPersonaOrDefault();
      setIsLoading(false);
    }
  }, []);

  const fetchSupabaseProfile = async (userId: string) => {
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error && data.role) {
        const mappedProfile: UserProfile = {
          id: data.id,
          fullName: data.full_name || 'AgriLink User',
          phone: data.phone || '',
          role: data.role as UserRole,
          district: data.district || 'Nashik',
          state: data.state || 'Maharashtra',
          latitude: data.latitude || 20.0059,
          longitude: data.longitude || 73.7898,
          fpoName: data.fpo_name,
          rating: data.rating || 4.8,
          verified: data.verified !== false,
        };
        setProfile(mappedProfile);
        setRole(mappedProfile.role);
      } else {
        console.warn(`[AgriLink Auth] Profile not found in public.profiles for user ${userId}. No fallback role assigned.`);
        setProfile(null);
        setRole(null);
        setProfileError('Profile not found / account setup incomplete. No platform role is assigned to this account.');
      }
    } catch (err) {
      console.error('[AgriLink Auth] Failed to fetch Supabase profile:', err);
      setProfile(null);
      setRole(null);
      setProfileError('Failed to fetch profile from database. Account setup incomplete.');
    }
  };

  const loadStoredPersonaOrDefault = () => {
    if (ENABLE_DEMO_PERSONAS) {
      const savedRole = localStorage.getItem(LOCAL_STORAGE_PERSONA_KEY) as UserRole | null;
      const target = MOCK_USERS.find((u) => u.role === savedRole) || MOCK_USERS[0];
      setProfile(target);
      setRole(target.role);
    } else {
      setProfile(null);
      setRole(null);
    }
  };

  const signInWithDemoPersona = (targetRole: UserRole) => {
    if (!ENABLE_DEMO_PERSONAS) {
      console.warn('[AgriLink Auth] Demo personas are disabled via VITE_ENABLE_DEMO_PERSONAS.');
      return;
    }
    // Strict Guard: If real Supabase session is active, do not allow persona override
    if (isSupabaseConfigured && user) {
      console.warn('[AgriLink Auth] Cannot override real authenticated Supabase session with demo persona.');
      return;
    }
    const matched = MOCK_USERS.find((u) => u.role === targetRole) || MOCK_USERS[0];
    localStorage.setItem(LOCAL_STORAGE_PERSONA_KEY, targetRole);
    setProfile(matched);
    setRole(matched.role);
    setUser({ id: matched.id, email: `${matched.role}@agrilink.gov.in` });
    setIsAuthModalOpen(false);
  };

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      console.log('[AgriLink Auth] Attempting signInWithPassword for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('[AgriLink Auth] signInWithPassword error:', {
          message: error.message,
          code: (error as any).code,
          status: (error as any).status,
          name: error.name,
        });
        return { error };
      }
      if (data.user) {
        setUser(data.user);
        await fetchSupabaseProfile(data.user.id);
        setIsAuthModalOpen(false);
      }
      return { error: null };
    } else {
      if (ENABLE_DEMO_PERSONAS) {
        const matched = MOCK_USERS.find((u) => u.phone.includes(email) || u.fullName.toLowerCase().includes(email.toLowerCase())) || MOCK_USERS[0];
        setProfile(matched);
        setRole(matched.role);
        setUser({ id: matched.id, email });
        setIsAuthModalOpen(false);
        return { error: null };
      } else {
        return { error: { message: 'Supabase authentication is not configured in this environment.' } };
      }
    }
  };

  const signUp = async (email: string, password: string, profileData: Partial<UserProfile>) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: profileData.fullName,
            phone: profileData.phone,
            role: profileData.role || 'farmer',
            district: profileData.district || 'Nashik',
            state: profileData.state || 'Maharashtra',
            latitude: profileData.latitude || 20.0059,
            longitude: profileData.longitude || 73.7898,
            fpo_name: profileData.fpoName,
          },
        },
      });

      if (error) {
        console.error('[AgriLink Auth] signUp error:', {
          message: error.message,
          code: (error as any).code,
          status: (error as any).status,
        });
        return { error };
      }

      if (data.user) {
        const needsEmailConfirmation = !data.user.email_confirmed_at && !data.session;
        if (needsEmailConfirmation) {
          console.log('[AgriLink Auth] Signup success; email confirmation pending for:', email);
          return { error: { message: `✅ Registration submitted! A confirmation email has been sent to ${email}. Please click the link in your inbox to verify your account, then sign in.`, code: 'email_confirmation_pending', name: 'EmailConfirmationPending' } };
        }
        setUser(data.user);
        await fetchSupabaseProfile(data.user.id);
        setIsAuthModalOpen(false);
      }
      return { error: null };
    } else {
      if (ENABLE_DEMO_PERSONAS) {
        const newProfile: UserProfile = {
          id: `usr-${Date.now().toString(36)}`,
          fullName: profileData.fullName || 'Registered User',
          phone: profileData.phone || '+91 99000 11223',
          role: (profileData.role as UserRole) || 'farmer',
          district: profileData.district || 'Nashik',
          state: profileData.state || 'Maharashtra',
          latitude: profileData.latitude || 20.0059,
          longitude: profileData.longitude || 73.7898,
          fpoName: profileData.fpoName,
          rating: 5.0,
          verified: true,
        };
        setProfile(newProfile);
        setRole(newProfile.role);
        setUser({ id: newProfile.id, email });
        setIsAuthModalOpen(false);
        return { error: null };
      } else {
        return { error: { message: 'Supabase registration is not configured in this environment.' } };
      }
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole(null);
    setProfileError(null);
    localStorage.removeItem(LOCAL_STORAGE_PERSONA_KEY);
    if (ENABLE_DEMO_PERSONAS) {
      loadStoredPersonaOrDefault();
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const { role: _role, id: _id, verified: _verified, ...safeUpdates } = updates as any;
    const updated = { ...profile, ...safeUpdates };
    setProfile(updated);

    if (isSupabaseConfigured && user) {
      await supabase.from('profiles').update({
        full_name: updated.fullName,
        phone: updated.phone,
        district: updated.district,
        state: updated.state,
        fpo_name: updated.fpoName,
      }).eq('id', user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        profileError,
        enableDemoPersonas: ENABLE_DEMO_PERSONAS,
        isAuthModalOpen,
        setIsAuthModalOpen,
        signInWithDemoPersona,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
