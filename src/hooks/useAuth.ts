'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // Initial session fetch — getUser() validates against the server
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setLoading(false);
    });

    // Subscribe to auth state changes.
    // Use a synchronous callback that spawns an async block to avoid deadlock
    // (calling supabase methods inside an async onAuthStateChange callback
    // can deadlock the internal auth lock).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();
        setUser(refreshedUser);
        setIsAuthenticated(!!refreshedUser);
        setLoading(false);
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated };
}
