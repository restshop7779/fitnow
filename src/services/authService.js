import { supabaseAuthRequest } from "../lib/supabaseClient.js";

const STORAGE_KEY = "fitnow:user";

const guestUser = {
  id: "guest-fitnow-user",
  email: null,
  name: "게스트 스타일러",
  isGuest: true,
};

export async function getCurrentUser() {
  const callbackUser = handleAuthCallbackFromUrl();
  if (callbackUser) return callbackUser;

  const saved = readSavedUser();
  return saved ?? guestUser;
}

export async function signInWithEmail(email) {
  await supabaseAuthRequest("otp", {
    method: "POST",
    body: JSON.stringify({
      email,
      create_user: true,
      should_create_user: true,
    }),
  });

  const user = {
    id: `email-${email.toLowerCase()}`,
    email,
    name: email.split("@")[0],
    isGuest: false,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function continueAsGuest() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guestUser));
  return guestUser;
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  return guestUser;
}

export function getGuestUser() {
  return guestUser;
}

function readSavedUser() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function handleAuthCallbackFromUrl() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const email = params.get("email");

  if (!accessToken) return null;

  const user = {
    id: `supabase-${email ?? accessToken.slice(0, 12)}`,
    email,
    name: email ? email.split("@")[0] : "FitNow 사용자",
    isGuest: false,
    accessToken,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return user;
}
