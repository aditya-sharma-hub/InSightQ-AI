import React, { createContext, useContext, useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { supabase } from '../lib/supabase.js';
import { authService } from '../services/auth/authService.js';

export type AuthState = 'unauthenticated' | 'authenticating' | 'authenticated';

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  authState: 'unauthenticated' as AuthState,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signInWithMicrosoft: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
  refreshSession: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('unauthenticated');

  const loadUserProfile = async (authUser: any) => {
    if (!authUser) {
      setProfile(null);
      setAuthState('unauthenticated');
      return;
    }
    setAuthState('authenticating');
    try {
      const userProfile = await authService.ensureUserProfile(authUser);
      setProfile(userProfile);
      setAuthState('authenticated');
    } catch (err) {
      console.error('Failed to load profile:', err);
      setAuthState('authenticated');
    }
  };

  useEffect(() => {
    /* Restore Active Session on Application Load */
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
        setAuthState('unauthenticated');
      }
    });

    /* Listen for Real-Time Auth State Changes */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setProfile(null);
        setAuthState('unauthenticated');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshSession = async () => {
    const currentSession = await authService.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    if (currentSession?.user) {
      await loadUserProfile(currentSession.user);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    authState,
    signUp: authService.signUp,
    signIn: authService.signInWithEmail,
    signInWithGoogle: authService.signInWithGoogle,
    signInWithMicrosoft: authService.signInWithMicrosoft,
    resetPassword: authService.resetPassword,
    signOut: authService.signOut,
    refreshSession
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => useContext(AuthContext);
