const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export async function supabaseRequest(path, options = {}) {
  if (!isSupabaseConfigured) return null;
  const savedUser = readSavedUser();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${savedUser?.accessToken ?? supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

export async function supabaseAuthRequest(path, options = {}) {
  if (!isSupabaseConfigured) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase auth request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function readSavedUser() {
  try {
    const value = localStorage.getItem("fitnow:user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
