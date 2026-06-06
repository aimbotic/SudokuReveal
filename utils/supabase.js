const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createRestClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

function createRestClient(url, anonKey) {
  const baseUrl = url.replace(/\/$/, '');

  return {
    from(tableName) {
      return {
        upsert(payload, options = {}) {
          return upsertRows(baseUrl, anonKey, tableName, payload, options);
        },
      };
    },
  };
}

async function upsertRows(baseUrl, anonKey, tableName, payload, options) {
  const params = new URLSearchParams();
  if (options.onConflict) {
    params.set('on_conflict', options.onConflict);
  }

  const endpoint = `${baseUrl}/rest/v1/${tableName}${params.toString() ? `?${params}` : ''}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      return { error: new Error(message || `Supabase request failed with ${response.status}`) };
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
}
