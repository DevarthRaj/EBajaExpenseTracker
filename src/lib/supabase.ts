// ============================================================
// Supabase Client — Secure session storage via expo-secure-store
// ============================================================
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─── SecureStore adapter for Supabase session persistence ────
// This stores JWT tokens in the device's encrypted keychain
// instead of AsyncStorage, which is unencrypted.
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // If value too large for SecureStore (>2048 bytes), chunk it
      // Supabase tokens can occasionally exceed this limit
      const chunks = chunkString(value, 1800);
      await SecureStore.setItemAsync(`${key}_count`, String(chunks.length));
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_${i}`, chunks[i]);
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
      // Also clean up any chunks
      const countStr = await SecureStore.getItemAsync(`${key}_count`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_count`);
      }
    } catch {
      // ignore
    }
  },
};

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Auto-logout on 401 Unauthorized responses
    fetch: async (url, options = {}) => {
      const response = await fetch(url, options);
      if (response.status === 401) {
        await supabase.auth.signOut();
      }
      return response;
    },
  },
});
