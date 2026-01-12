import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://eqztgdhhhhrmdfvlgnhx.supabase.co';
const supabaseAnonKey = 'sb_publishable_xzxk7Avlv3abcYCGd00abQ_pzTl3lVa';

const isBrowser = typeof window !== 'undefined';
const isWeb = Platform.OS === 'web';
const inMemoryStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? (isBrowser ? AsyncStorage : inMemoryStorage) : AsyncStorage,
    autoRefreshToken: !isWeb || isBrowser,
    persistSession: !isWeb || isBrowser,
    detectSessionInUrl: isBrowser,
  },
});
