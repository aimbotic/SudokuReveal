import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF;
const aimboticSupabaseUrl = process.env.EXPO_PUBLIC_AIMBOTIC_SUPABASE_URL;
const aimboticSupabaseAnonKey = process.env.EXPO_PUBLIC_AIMBOTIC_SUPABASE_ANON_KEY;
const aimboticExpectedProjectRef = process.env.EXPO_PUBLIC_AIMBOTIC_SUPABASE_PROJECT_REF;

const FORBIDDEN_PROJECT_REFS = new Set([
  'vaoqvtxqvbptyxddpoju', // Trusted Bums
]);

let client = null;
let aimboticClient = null;

function getProjectRefFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function isAllowedSupabaseProject(url, pinnedProjectRef) {
  const projectRef = getProjectRefFromUrl(url);

  if (!projectRef || !pinnedProjectRef || FORBIDDEN_PROJECT_REFS.has(projectRef)) {
    return false;
  }

  return projectRef === pinnedProjectRef;
}

function createManagedClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      isAllowedSupabaseProject(supabaseUrl, expectedProjectRef)
  );
}

export function isAimboticSupabaseConfigured() {
  return Boolean(
    aimboticSupabaseUrl &&
      aimboticSupabaseAnonKey &&
      isAllowedSupabaseProject(aimboticSupabaseUrl, aimboticExpectedProjectRef)
  );
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createManagedClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

export function getAimboticSupabaseClient() {
  if (!isAimboticSupabaseConfigured()) {
    return null;
  }

  if (!aimboticClient) {
    aimboticClient = createManagedClient(aimboticSupabaseUrl, aimboticSupabaseAnonKey);
  }

  return aimboticClient;
}

export function getSyncSupabaseClient() {
  return getAimboticSupabaseClient() ?? getSupabaseClient();
}
