import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    // 1. Check Guest Mode from storage
    const { isGuestMode } = await chrome.storage.local.get(['isGuestMode']);
    if (isGuestMode) {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // 2. Check Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // If user signs in, disable guest mode
        setIsGuest(false);
        chrome.storage.local.set({ isGuestMode: false });
      }
    });

    return () => subscription.unsubscribe();
  };

  const signIn = async () => {
    if (!supabase) {
      console.error('[DejaVista] ✗ Supabase not initialized');
      return;
    }

    try {
      const extensionId = chrome.runtime.id;
      const redirectUrl = `https://${extensionId}.chromiumapp.org/`;
      console.log('[DejaVista] Starting OAuth flow...', { redirectUrl });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // Launch OAuth flow
      chrome.identity.launchWebAuthFlow(
        {
          url: data.url,
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            console.error('[DejaVista] ✗ OAuth error:', chrome.runtime.lastError);
            return;
          }

          // Extract tokens from redirect URL
          const url = new URL(redirectUrl);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[DejaVista] ✗ Session error:', error);
            } else {
              console.log('[DejaVista] ✓ Successfully signed in:', session?.user?.email);
              showToast('Signed in successfully', 'success');
            }
          } else {
            console.error('[DejaVista] ✗ No tokens in redirect URL');
          }
        }
      );
    } catch (error) {
      console.error('[DejaVista] ✗ Sign in error:', error);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    console.log('[DejaVista] Signing out...');
    await supabase.auth.signOut();
    console.log('[DejaVista] ✓ Successfully signed out');
    showToast('Signed out', 'info');
  };

  const enterGuestMode = async () => {
    setIsGuest(true);
    await chrome.storage.local.set({ isGuestMode: true });
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signIn, signOut, enterGuestMode, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
