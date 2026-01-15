import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  try {
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
  } catch (err) {
    return {
      user: null,
      error: { message: 'An unexpected error occurred' },
    };
  }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    return { error: { message: 'An unexpected error occurred' } };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    return null;
  }
}

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (err) {
    return false;
  }
}

export function onAuthStateChange(callback: (authenticated: boolean) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(!!session);
  });

  return subscription;
}
