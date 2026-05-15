import { createBrowserSupabaseClient } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        error: { message: 'Invalid email or password' },
      };
    }

    return {
      user: data.user,
      error: null,
    };
  } catch {
    return {
      user: null,
      error: { message: 'An unexpected error occurred' },
    };
  }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch {
    return { error: { message: 'An unexpected error occurred' } };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export function onAuthStateChange(callback: (authenticated: boolean) => void) {
  const supabase = createBrowserSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });

  return subscription;
}
