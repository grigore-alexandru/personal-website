import { useState, useEffect } from 'react';
import { getCurrentUser, onAuthStateChange } from '../utils/authService';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setLoading(false);
    };

    checkUser();

    const subscription = onAuthStateChange((authenticated) => {
      if (!authenticated) {
        setUser(null);
        setIsAuthenticated(false);
      } else {
        checkUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated };
}
